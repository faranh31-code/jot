import { Platform } from 'react-native';
import { storageGet, storageSet } from './storage';
import { FREE_JOT_LIMIT } from '../types';

let Purchases: any = null;
let _purchasesReady = false;

const REVENUECAT_API_KEY_IOS = 'appl_domEJJjtYWUBNLiMEpKpVPIRhLW';
const REVENUECAT_API_KEY_ANDROID = 'goog_OCuxlMUseJWHiEaRlqUsTCPMjfP';
const REVENUECAT_TEST_STORE_KEY = 'test_SQJbbUHhgbKfDUamfFcPQnYtCNN';

const ENTITLEMENT_ID = 'pro';

export interface SubscriptionStatus {
  isPro: boolean;
  plan: 'free' | 'pro_monthly' | 'pro_annual' | 'pro_lifetime' | 'pro_referral';
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

async function loadPurchases() {
  if (_purchasesReady) return;
  try {
    Purchases = require('react-native-purchases').default;
    const isExpoGo =
      typeof globalThis !== 'undefined' &&
      (globalThis as any).expo?.modules?.ExponentConstants?.appOwnership === 'expo';
    const apiKey = isExpoGo
      ? REVENUECAT_TEST_STORE_KEY
      : Platform.OS === 'ios'
      ? REVENUECAT_API_KEY_IOS
      : REVENUECAT_API_KEY_ANDROID;
    if (apiKey.startsWith('REPLACE')) {
      console.log('[Subscription] RevenueCat API key not configured, using local fallback');
      return;
    }
    await Purchases.configure({ apiKey });
    _purchasesReady = true;
    console.log('[Subscription] RevenueCat configured successfully');
  } catch (error) {
    console.log('[Subscription] RevenueCat not available, using local fallback:', (error as Error).message);
  }
}

function parseCustomerInfo(customerInfo: any): SubscriptionStatus {
  const entitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
  if (entitlement) {
    const productIdentifier = entitlement.productIdentifier || '';
    const plan = productIdentifier.includes('lifetime')
      ? 'pro_lifetime'
      : productIdentifier.includes('annual')
      ? 'pro_annual'
      : 'pro_monthly';
    // Lifetime (non-consumable) entitlements have no expiresDate — never expires, never renews.
    const expiresAt = entitlement.expiresDate ? new Date(entitlement.expiresDate).getTime() : null;
    const willRenew = plan === 'pro_lifetime' ? false : entitlement.willRenew ?? true;
    return {
      isPro: true,
      plan,
      expiresAt,
      willRenew,
    };
  }
  return {
    isPro: false,
    plan: 'free',
    expiresAt: null,
    willRenew: false,
  };
}

export const initSubscription = async () => {
  try {
    const stored = await storageGet(STATUS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SubscriptionStatus;
      if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
        _status = parsed;
      } else if (parsed.expiresAt && parsed.expiresAt <= Date.now()) {
        _status = { isPro: false, plan: 'free', expiresAt: null, willRenew: false };
        await storageSet(STATUS_KEY, JSON.stringify(_status));
      } else {
        _status = parsed;
      }
    }
  } catch {}

  await loadPurchases();

  if (_purchasesReady && Purchases) {
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      _status = parseCustomerInfo(customerInfo);
      await storageSet(STATUS_KEY, JSON.stringify(_status));
      notifyListeners();
    } catch (error) {
      console.log('[Subscription] Failed to get customer info:', (error as Error).message);
    }

    try {
      Purchases.addCustomerInfoUpdateListener(async (customerInfo: any) => {
        _status = parseCustomerInfo(customerInfo);
        await storageSet(STATUS_KEY, JSON.stringify(_status));
        notifyListeners();
      });
    } catch {}
  }
};

export const getSubscriptionStatus = (): SubscriptionStatus => ({ ..._status });

export const isPro = (): boolean => _status.isPro;

export const getJotLimit = (): number => FREE_JOT_LIMIT;

export const canCreateJot = (currentCount: number): boolean => {
  return _status.isPro || currentCount < FREE_JOT_LIMIT;
};

export const getRemainingJots = (currentCount: number): number => {
  if (_status.isPro) return Infinity;
  return Math.max(0, FREE_JOT_LIMIT - currentCount);
};

export const onSubscriptionChange = (callback: (status: SubscriptionStatus) => void) => {
  _statusListeners.push(callback);
  return () => {
    _statusListeners = _statusListeners.filter((cb) => cb !== callback);
  };
};

export const getOfferings = async () => {
  if (!_purchasesReady || !Purchases) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch {
    return null;
  }
};

export const purchaseProMonthly = async (): Promise<boolean> => {
  if (!_purchasesReady || !Purchases) {
    console.log('[Subscription] RevenueCat not available, simulating purchase');
    _status = {
      isPro: true,
      plan: 'pro_monthly',
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      willRenew: true,
    };
    await storageSet(STATUS_KEY, JSON.stringify(_status));
    notifyListeners();
    return true;
  }

  try {
    const offerings = await Purchases.getOfferings();
    const monthly = offerings?.current?.monthly;
    if (!monthly) {
      console.log('[Subscription] Monthly offering not found');
      return false;
    }
    const { customerInfo } = await Purchases.purchasePackage(monthly);
    _status = parseCustomerInfo(customerInfo);
    await storageSet(STATUS_KEY, JSON.stringify(_status));
    notifyListeners();
    return true;
  } catch (error: any) {
    if (error?.userCancelled) {
      console.log('[Subscription] User cancelled purchase');
      return false;
    }
    console.error('[Subscription] Purchase failed:', error);
    return false;
  }
};

export const purchaseProAnnual = async (): Promise<boolean> => {
  if (!_purchasesReady || !Purchases) {
    console.log('[Subscription] RevenueCat not available, simulating purchase');
    _status = {
      isPro: true,
      plan: 'pro_annual',
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      willRenew: true,
    };
    await storageSet(STATUS_KEY, JSON.stringify(_status));
    notifyListeners();
    return true;
  }

  try {
    const offerings = await Purchases.getOfferings();
    const annual = offerings?.current?.annual;
    if (!annual) {
      console.log('[Subscription] Annual offering not found');
      return false;
    }
    const { customerInfo } = await Purchases.purchasePackage(annual);
    _status = parseCustomerInfo(customerInfo);
    await storageSet(STATUS_KEY, JSON.stringify(_status));
    notifyListeners();
    return true;
  } catch (error: any) {
    if (error?.userCancelled) {
      console.log('[Subscription] User cancelled purchase');
      return false;
    }
    console.error('[Subscription] Purchase failed:', error);
    return false;
  }
};

export const purchaseProLifetime = async (): Promise<boolean> => {
  if (!_purchasesReady || !Purchases) {
    console.log('[Subscription] RevenueCat not available, simulating purchase');
    _status = {
      isPro: true,
      plan: 'pro_lifetime',
      expiresAt: null,
      willRenew: false,
    };
    await storageSet(STATUS_KEY, JSON.stringify(_status));
    notifyListeners();
    return true;
  }

  try {
    const offerings = await Purchases.getOfferings();
    const lifetime = offerings?.current?.lifetime;
    if (!lifetime) {
      console.log('[Subscription] Lifetime offering not found');
      return false;
    }
    const { customerInfo } = await Purchases.purchasePackage(lifetime);
    _status = parseCustomerInfo(customerInfo);
    await storageSet(STATUS_KEY, JSON.stringify(_status));
    notifyListeners();
    return true;
  } catch (error: any) {
    if (error?.userCancelled) {
      console.log('[Subscription] User cancelled purchase');
      return false;
    }
    console.error('[Subscription] Purchase failed:', error);
    return false;
  }
};

export const restorePurchases = async (): Promise<boolean> => {
  if (!_purchasesReady || !Purchases) return false;

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const newStatus = parseCustomerInfo(customerInfo);
    if (newStatus.isPro) {
      _status = newStatus;
      await storageSet(STATUS_KEY, JSON.stringify(_status));
      notifyListeners();
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Subscription] Restore failed:', error);
    return false;
  }
};

export const setProStatus = async (status: SubscriptionStatus) => {
  _status = status;
  await storageSet(STATUS_KEY, JSON.stringify(status));
  notifyListeners();
};

export const logoutRevenueCat = async () => {
  if (_purchasesReady && Purchases) {
    try {
      await Purchases.logOut();
    } catch {}
  }
};
