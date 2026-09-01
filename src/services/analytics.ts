import { storageGet, storageSet } from './storage';

type AnalyticsEvent =
  | { event: 'install' }
  | { event: 'first_open' }
  | { event: 'first_jot_created' }
  | { event: 'first_jot_saved' }
  | { event: 'first_copy' }
  | { event: 'first_share' }
  | { event: 'jot_created'; params: { category: string; hasTags: boolean } }
  | { event: 'jot_edited'; params: { category: string } }
  | { event: 'jot_deleted' }
  | { event: 'jot_pinned' }
  | { event: 'search_used' }
  | { event: 'tag_added'; params: { tagCount: number } }
  | { event: 'share_started'; params: { type: 'text' | 'image' | 'deep_link' | 'share_extension' } }
  | { event: 'share_completed'; params: { type: 'text' | 'image' } }
  | { event: 'jot_card_created'; params: { style: string } }
  | { event: 'referral_link_created' }
  | { event: 'referral_signup' }
  | { event: 'referral_activation' }
  | {
      event: 'paywall_viewed';
      params: { trigger: 'limit' | 'pro_feature' | 'jot_card_style' | 'branding' | string };
    }
  | { event: 'monthly_selected' }
  | { event: 'annual_selected' }
  | { event: 'lifetime_selected' }
  | { event: 'purchase_started' }
  | { event: 'purchase_success'; params: { plan: 'pro_monthly' | 'pro_annual' | 'pro_lifetime' } }
  | { event: 'subscription_cancelled' }
  | { event: 'subscription_expired' }
  | { event: 'session'; params: { duration: number } }
  | { event: 'active_user' }
  | { event: 'return_session'; params: { daysSinceInstall: number } }
  | { event: 'app_open_ad_shown' }
  | { event: 'interstitial_ad_shown' }
  | { event: 'banner_ad_loaded' };

const EVENT_LOG_KEY = 'jotapp_analytics_log';
const MAX_EVENTS = 500;

let _sessionStart = Date.now();
let _events: { timestamp: number; event: string; params?: any }[] = [];

export const trackEvent = async (event: AnalyticsEvent) => {
  const entry = { timestamp: Date.now(), ...event };
  _events.push(entry);
  if (__DEV__) {
    console.log(`[Analytics] ${event.event}`, 'params' in event ? event.params : '');
  }
  if (_events.length > MAX_EVENTS) {
    _events = _events.slice(-MAX_EVENTS);
  }
  await persistEvents();
};

export const flushEvents = async () => {
  await persistEvents();
};

const persistEvents = async () => {
  try {
    await storageSet(EVENT_LOG_KEY, JSON.stringify(_events.slice(-100)));
  } catch {}
};

export const getEventLog = () => [..._events];

export const startSession = () => {
  _sessionStart = Date.now();
  trackEvent({ event: 'session', params: { duration: 0 } });
};

export const endSession = () => {
  const duration = Math.floor((Date.now() - _sessionStart) / 1000);
  trackEvent({ event: 'session', params: { duration } });
};

export const trackFirstJot = async () => {
  const hasCreated = await storageGet('jotapp_has_created_jot');
  if (!hasCreated) {
    await storageSet('jotapp_has_created_jot', 'true');
    trackEvent({ event: 'first_jot_created' });
  }
};

export const trackFirstCopy = async () => {
  const hasCopied = await storageGet('jotapp_has_copied');
  if (!hasCopied) {
    await storageSet('jotapp_has_copied', 'true');
    trackEvent({ event: 'first_copy' });
  }
};

export const trackFirstShare = async () => {
  const hasShared = await storageGet('jotapp_has_shared');
  if (!hasShared) {
    await storageSet('jotapp_has_shared', 'true');
    trackEvent({ event: 'first_share' });
  }
};

// ─── Retention (local, single-device proxy — not cross-user cohort data) ──────
// Answers "did this installation come back after N days," derived entirely
// from timestamps stored on-device. There is no backend, so this can't
// distinguish a genuinely new device from a returning one across installs.

const INSTALL_KEY = 'jotapp_first_install_ts';
const D1_KEY = 'jotapp_retention_d1';
const D7_KEY = 'jotapp_retention_d7';
const D30_KEY = 'jotapp_retention_d30';
const DAY_MS = 24 * 60 * 60 * 1000;

export interface RetentionStats {
  installedAt: number;
  daysSinceInstall: number;
  d1: boolean;
  d7: boolean;
  d30: boolean;
}

// Idempotent: safe to call every session (records the install moment once,
// then flips each day-N flag the first time it's crossed) and safe to call
// read-only from the stats screen (re-checking already-set flags is a no-op).
export const getRetentionStats = async (): Promise<RetentionStats> => {
  let installedAt: number;
  const storedInstall = await storageGet(INSTALL_KEY);
  if (storedInstall) {
    installedAt = parseInt(storedInstall, 10);
  } else {
    installedAt = Date.now();
    await storageSet(INSTALL_KEY, String(installedAt));
  }

  const daysSinceInstall = Math.floor((Date.now() - installedAt) / DAY_MS);

  const [d1Stored, d7Stored, d30Stored] = await Promise.all([
    storageGet(D1_KEY),
    storageGet(D7_KEY),
    storageGet(D30_KEY),
  ]);
  let d1 = d1Stored === 'true';
  let d7 = d7Stored === 'true';
  let d30 = d30Stored === 'true';

  if (!d1 && daysSinceInstall >= 1) {
    d1 = true;
    await storageSet(D1_KEY, 'true');
  }
  if (!d7 && daysSinceInstall >= 7) {
    d7 = true;
    await storageSet(D7_KEY, 'true');
  }
  if (!d30 && daysSinceInstall >= 30) {
    d30 = true;
    await storageSet(D30_KEY, 'true');
  }

  return { installedAt, daysSinceInstall, d1, d7, d30 };
};
