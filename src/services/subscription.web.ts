// Web build stub — mirrors ads.web.ts. react-native-purchases is native-only,
// so this gives the web bundle a local-simulation-only implementation instead
// of crashing at import time. Native (iOS/Android) builds are unaffected:
// Metro resolves subscription.ts for those platforms exactly as before.
// Mirrors subscription.ts's local-fallback behavior (same status shape, same
// simulated purchases) so web-preview testing exercises equivalent logic.
import { storageGet, storageSet } from './storage';
import { FREE_JOT_LIMIT } from '../types';

export interface SubscriptionStatus {
  isPro: boolean;
  plan: 'free' | 'pro_monthly' | 'pro_annual' | 'pro_lifetime';
  expiresAt: number | null;
  willRenew: boolean;
}

let _status: SubscriptionStatus = {
  isPro: false,
  plan: 'free',
  expiresAt: null,
  willRenew: false,
};

let _statusListeners: ((status: SubscriptionStatus) => void)[] = [];

const STATUS_KEY = 'jotapp_subscription_status';

function notifyListeners() {
  _statusListeners.forEach((cb) => cb({ ..._status }));
}

export const initSubscription = async () => {
  try {
    const stored = await storageGet(STATUS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SubscriptionStatus;
      if (parsed.expiresAt && parsed.expiresAt <= Date.now()) {
        _status = { isPro: false, plan: 'free', expiresAt: null, willRenew: false };
        await storageSet(STATUS_KEY, JSON.stringify(_status));
      } else {
        _status = parsed;
      }
    }
  } catch {}
};

export const getSubscriptionStatus = (): SubscriptionStatus => ({ ..._status });
export const isPro = (): boolean => _status.isPro;
export const getJotLimit = (): number => FREE_JOT_LIMIT;
export const canCreateJot = (currentCount: number): boolean => _status.isPro || currentCount < FREE_JOT_LIMIT;
export const getRemainingJots = (currentCount: number): number =>
  _status.isPro ? Infinity : Math.max(0, FREE_JOT_LIMIT - currentCount);

export const onSubscriptionChange = (callback: (status: SubscriptionStatus) => void) => {
  _statusListeners.push(callback);
  return () => {
    _statusListeners = _statusListeners.filter((cb) => cb !== callback);
  };
};

export const getOfferings = async () => null;

async function simulatePurchase(plan: SubscriptionStatus['plan'], expiresAt: number | null, willRenew: boolean) {
  _status = { isPro: true, plan, expiresAt, willRenew };
  await storageSet(STATUS_KEY, JSON.stringify(_status));
  notifyListeners();
  return true;
}

export const purchaseProMonthly = async (): Promise<boolean> =>
  simulatePurchase('pro_monthly', Date.now() + 30 * 24 * 60 * 60 * 1000, true);
export const purchaseProAnnual = async (): Promise<boolean> =>
  simulatePurchase('pro_annual', Date.now() + 365 * 24 * 60 * 60 * 1000, true);
export const purchaseProLifetime = async (): Promise<boolean> =>
  simulatePurchase('pro_lifetime', null, false);

export const restorePurchases = async (): Promise<boolean> => false;

export const setProStatus = async (status: SubscriptionStatus) => {
  _status = status;
  await storageSet(STATUS_KEY, JSON.stringify(status));
  notifyListeners();
};

export const logoutRevenueCat = async () => {};
