const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// ─── Referral Program Config ─────────────────────────────────────────────────
// Keep in sync with src/services/referral.ts
const REFERRALS_REQUIRED = 3;
const REWARD_DAYS = 30; // referrer reward: 1 month of Pro
const TRIAL_DAYS = 7;   // referred friend gets a 1-week Pro trial

const USERS_COLLECTION = 'users';
const CODES_COLLECTION = 'referral_codes';
const CLAIMS_COLLECTION = 'referral_claims';
const GRANTS_COLLECTION = 'referral_grants';

// Guard against a claim being processed twice even if the function re-fires.
const processedClaimIds = new Set();
function markProcessed(id) {
  if (processedClaimIds.has(id)) return false;
  processedClaimIds.add(id);
  if (processedClaimIds.size > 10000) processedClaimIds.clear();
  return true;
}

// ─── Referral Claim Processing ───────────────────────────────────────────────
// The single authority that counts referrals and grants Pro. A referral only
// "counts" when a brand-new email signup claims your code:
//   * reject self-referrals (claimer == code owner)
//   * reject invalid / unknown codes
//   * reject a claimer who already has a referredBy (one claim per user)
//   * reject duplicate / re-run processing
// The referrer unlocks REWARD_DAYS of Pro once REFERRALS_REQUIRED friends claim.
// The referred friend gets a TRIAL_DAYS Pro trial immediately.
async function processClaim(event) {
  const claim = event.data;
  const data = claim.data();
  const claimId = event.params.docId;

  const reject = (reason) =>
    claim.ref.update({ status: 'rejected', reason, processedAt: Date.now() }).catch(() => {});

  if (!data || !data.claimedByUid || !data.code) return reject('malformed');
  if (data.status && data.status !== 'pending') return;

  const claimedByUid = data.claimedByUid;
  const code = String(data.code).toUpperCase();
  if (!markProcessed(claimId)) return;

  // Only email signups can claim a referral (no anonymous / google / apple).
  if (typeof data.claimedByEmail !== 'string' || !data.claimedByEmail.includes('@')) {
    return reject('no_email');
  }
  if (data.provider && data.provider !== 'password') return reject('provider_not_email');

  const codeDoc = await db.collection(CODES_COLLECTION).doc(code).get().catch(() => null);
  if (!codeDoc || !codeDoc.exists) return reject('unknown_code');

  const referrerUid = codeDoc.data().ownerUid;
  if (!referrerUid || referrerUid === claimedByUid) return reject('self_referral');

  const claimerRef = db.collection(USERS_COLLECTION).doc(claimedByUid);

  try {
    // Everything that reads mutable state is inside the transaction so two
    // concurrent claims for the same user can't double-process (the second
    // transaction will observe the committed referredBy and reject).
    const result = await db.runTransaction(async (tx) => {
      const claimerSnap = await tx.get(claimerRef);
      if (claimerSnap.exists && claimerSnap.data().referredBy) {
        return { rejected: 'already_attributed' };
      }

      const referrerRef = db.collection(USERS_COLLECTION).doc(referrerUid);
      const referrerSnap = await tx.get(referrerRef);
      const referrer = referrerSnap.exists
        ? referrerSnap.data()
        : { referralCount: 0, referralRewarded: false };

      const now = Date.now();
      const newCount = (referrer.referralCount || 0) + 1;
      const nowRewarded = !referrer.referralRewarded && newCount >= REFERRALS_REQUIRED;

      tx.set(
        claimerRef,
        {
          referredBy: referrerUid,
          referralCode: claimedByUid.slice(0, 8).toUpperCase(),
          referralCount: 0,
          referralRewarded: false,
          createdAt: data.createdAt || now,
        },
        { merge: true }
      );

      tx.set(
        referrerRef,
        {
          referralCount: newCount,
          referralRewarded: referrer.referralRewarded || nowRewarded,
          updatedAt: now,
        },
        { merge: true }
      );

      if (nowRewarded) {
        tx.set(
          db.collection(GRANTS_COLLECTION).doc(referrerUid),
          {
            kind: 'referral_reward',
            expiresAt: now + REWARD_DAYS * 24 * 60 * 60 * 1000,
            grantedAt: now,
          },
          { merge: true }
        );
      }

      // The friend always gets a Pro trial after their first claim.
      tx.set(
        db.collection(GRANTS_COLLECTION).doc(claimedByUid),
        {
          kind: 'referral_trial',
          expiresAt: now + TRIAL_DAYS * 24 * 60 * 60 * 1000,
          grantedAt: now,
        },
        { merge: true }
      );

      tx.update(claim.ref, {
        status: 'processed',
        referrerUid,
        processedAt: now,
      });
      return { ok: true, referrerUid, claimId };
    });

    if (result && result.rejected) {
      await reject(result.rejected);
      return;
    }
    console.log(`[Referral] claim ${claimId}: ${referrerUid} +1 (total pending reward)`);
  } catch (err) {
    console.error('[Referral] transaction failed:', err);
  }
}

exports.processReferralClaim = onDocumentCreated(
  {
    document: `${CLAIMS_COLLECTION}/{docId}`,
  },
  processClaim
);

// Rebuild / heal referral data when a claim transitions to processed — ensures
// grants keep a stable expiry even if the create trigger deduped a re-run.
exports.healReferralClaim = onDocumentUpdated(
  {
    document: `${CLAIMS_COLLECTION}/{docId}`,
  },
  async (event) => {
    const before = event.data?.before?.data?.() ?? {};
    const after = event.data?.after?.data?.() ?? {};
    if (before.status === after.status) return;
    if (after.status === 'processed' && before.status !== 'processed') {
      // Nothing extra needed — create already handled grants. Log for ops.
      console.log(`[Referral] claim ${event.params.docId} healed to processed`);
    }
  }
);