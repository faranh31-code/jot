// ─── Referral Client Service ─────────────────────────────────────────────────
// Talks to the Firestore referral backend (functions/). The Cloud Function is
// the single authority that counts referrals and grants Pro; this module only:
//   * captures a pending invite code from a deep link / pasted URL
//   * submits one referral claim after a real email signup
//   * bootstraps the user's own referral profile + invite code doc
//   * reads back their referral stats and any Pro grant
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getDb } from "./firebase";
import { storageGet, storageSet, storageRemove } from "./storage";
import { setProStatus, getSubscriptionStatus } from "./subscription";
import { trackEvent } from "./analytics";

// Keep in sync with functions/index.js
export const REFERRALS_REQUIRED = 3;
export const REFERRAL_REWARD_DAYS = 30;
export const REFERRAL_TRIAL_DAYS = 7;

const USERS_COLLECTION = "users";
const CODES_COLLECTION = "referral_codes";
const CLAIMS_COLLECTION = "referral_claims";
const GRANTS_COLLECTION = "referral_grants";

const PENDING_CODE_KEY = "jotapp_pending_referral";

const CODE_RE = /\/r\/([A-Za-z0-9_-]+)/;
const QUERY_CODE_RE = /[?&]code=([A-Za-z0-9_-]+)/i;

export function deriveReferralCode(uid: string): string {
  return uid.slice(0, 8).toUpperCase();
}

// ─── Capture an invite code from a referral URL ──────────────────────────────

export async function captureReferralCode(rawUrl: string): Promise<string | null> {
  try {
    let code: string | null = null;
    const match = rawUrl.match(CODE_RE);
    if (match) code = match[1];
    if (!code) {
      const qMatch = rawUrl.match(QUERY_CODE_RE);
      if (qMatch) code = qMatch[1];
    }
    if (!code) return null;
    code = code.toUpperCase();
    await storageSet(PENDING_CODE_KEY, code);
    return code;
  } catch {
    return null;
  }
}

export async function getPendingReferralCode(): Promise<string | null> {
  const code = await storageGet(PENDING_CODE_KEY);
  return code ? code.toUpperCase() : null;
}

export async function clearPendingReferralCode(): Promise<void> {
  await storageRemove(PENDING_CODE_KEY);
}

// ─── Own referral profile ────────────────────────────────────────────────────

export interface ReferralProfile {
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  referralRewarded: boolean;
  createdAt: number;
}

// Bootstrap the user's referral profile + invite-code doc so that:
//   * Settings's "Refer & Get Pro" can share a stable code
//   * the backend can resolve that code to its owner
// Idempotent — safe to call on every login / settings open.
export async function ensureReferralProfile(uid: string): Promise<ReferralProfile | null> {
  const db = getDb();
  if (!db || !uid) return null;
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as ReferralProfile;
    }

    const referralCode = deriveReferralCode(uid);
    const profile: ReferralProfile = {
      referralCode,
      referredBy: null,
      referralCount: 0,
      referralRewarded: false,
      createdAt: Date.now(),
    };

    // Ensure the code -> owner mapping exists (create-only; owner-coded rule).
    try {
      await setDoc(doc(db, CODES_COLLECTION, referralCode), {
        ownerUid: uid,
        createdAt: Date.now(),
      });
    } catch {}

    await setDoc(userRef, { userId: uid, ...profile }, { merge: true });
    return profile;
  } catch (err) {
    console.warn("[Referral] ensureReferralProfile failed:", err);
    return null;
  }
}

// ─── Submit a referral claim after a real email signup ───────────────────────

export async function submitReferralClaim(
  user: { uid: string; email?: string | null; provider?: string }
): Promise<{ submitted: boolean; reason?: string }> {
  const db = getDb();
  const pendingCode = await getPendingReferralCode();
  if (!db || !pendingCode || !user?.uid) {
    return { submitted: false, reason: pendingCode ? "no_db" : "no_pending_code" };
  }

  // Emails only: anonymous / google / apple users skip the claim silently.
  const provider = user.provider || "";
  if (provider.includes("anonymous") || provider.includes("google") || provider.includes("apple")) {
    await clearPendingReferralCode();
    return { submitted: false, reason: "no_email_provider" };
  }
  if (!user.email) return { submitted: false, reason: "no_email" };

  try {
    const existing = await getDocs(
      query(collection(db, CLAIMS_COLLECTION), where("claimedByUid", "==", user.uid))
    );
    if (!existing.empty) {
      await clearPendingReferralCode();
      return { submitted: false, reason: "already_claimed" };
    }

    await addDoc(collection(db, CLAIMS_COLLECTION), {
      claimedByUid: user.uid,
      claimedByEmail: user.email,
      provider: "password",
      code: pendingCode,
      status: "pending",
      createdAt: Date.now(),
    });

    await clearPendingReferralCode();
    trackEvent({ event: "referral_signup", params: { code: pendingCode } });
    return { submitted: true };
  } catch (err) {
    console.warn("[Referral] submitReferralClaim failed:", err);
    return { submitted: false, reason: "failed" };
  }
}

// ─── Referral stats + Pro grant ──────────────────────────────────────────────

export async function getReferralProfile(uid: string): Promise<ReferralProfile | null> {
  const db = getDb();
  if (!db || !uid) return null;
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (!snap.exists()) return null;
    return snap.data() as ReferralProfile;
  } catch {
    return null;
  }
}

export interface ReferralGrantResult {
  active: boolean;
  kind?: string;
  expiresAt?: number;
  grantedAt?: number;
}

// Read back any Pro grant the backend issued for this account.
export async function getReferralGrant(uid: string): Promise<ReferralGrantResult | null> {
  const db = getDb();
  if (!db || !uid) return null;
  try {
    const snap = await getDoc(doc(db, GRANTS_COLLECTION, uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    const active = !!(data && data.expiresAt && data.expiresAt > Date.now());
    return {
      active,
      kind: data?.kind,
      expiresAt: data?.expiresAt,
      grantedAt: data?.grantedAt,
    };
  } catch {
    return null;
  }
}

// Turn a live referral grant into the in-memory Pro subscription. Prioritizes a
// longer-running plan: a referral grant never downgrades a lifetime/active plan,
// but it does grant Pro to free users and extends Pro when it outlasts a trial.
export async function applyReferralGrant(uid: string): Promise<void> {
  const grant = await getReferralGrant(uid);
  if (!grant || !grant.active || !grant.expiresAt) return;

  const current = getSubscriptionStatus();
  if (current.isPro) {
    if (current.plan === "pro_lifetime" || current.expiresAt == null) return;
    if (current.expiresAt >= grant.expiresAt) return;
  }

  await setProStatus({
    isPro: true,
    plan: "pro_referral",
    expiresAt: grant.expiresAt,
    willRenew: false,
  });
  trackEvent({ event: "referral_activation", params: { kind: grant.kind } });
}

// Convenience accessor for the Settings UI: code + progress toward the reward.
export async function getReferralSummary(
  uid: string
): Promise<{
  code: string | null;
  referralCount: number;
  referralRewarded: boolean;
  grantActive: boolean;
  grantKind?: string;
  referredBy: string | null;
}> {
  const profile = await getReferralProfile(uid);
  const grant = await getReferralGrant(uid);
  return {
    code: profile?.referralCode || null,
    referralCount: profile?.referralCount || 0,
    referralRewarded: profile?.referralRewarded || false,
    grantActive: !!grant?.active,
    grantKind: grant?.kind,
    referredBy: profile?.referredBy || null,
  };
}

// Share URL helper used by SettingsModal.
export function buildReferralUrl(code: string): string {
  return `https://faran.app/r/${code}`;
}

export function buildReferralMessage(code: string): string {
  return `Join me on Nota! Save anything, find everything.\n\n${buildReferralUrl(code)}`;
}