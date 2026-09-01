import { Platform } from "react-native";
import { getInterstitialAdUnitId, getAppOpenAdUnitId, getRewardedAdUnitId } from "../constants/admob";

let getTrackingPermissionsAsync: any = null;
let requestTrackingPermissionsAsync: any = null;
try {
  const attModule = require("expo-tracking-transparency");
  getTrackingPermissionsAsync = attModule.getTrackingPermissionsAsync;
  requestTrackingPermissionsAsync = attModule.requestTrackingPermissionsAsync;
} catch (e) {
  console.log("ads.ts: expo-tracking-transparency not available");
}

const isExpoGo = (global as any).expo?.modules?.ExponentConstants?.appOwnership === "expo";

let _ads: any = null;
let _adsLoading = false;

function loadAds() {
  if (_ads || _adsLoading || Platform.OS === "web" || isExpoGo) return;
  _adsLoading = true;
  try {
    const mod = require("react-native-google-mobile-ads");
    _ads = {
      mobileAds: mod.mobileAds,
      MaxAdContentRating: mod.MaxAdContentRating,
      RequestConfiguration: mod.RequestConfiguration,
      InterstitialAd: mod.InterstitialAd,
      RewardedAd: mod.RewardedAd,
      AppOpenAd: mod.AppOpenAd,
      AdEventType: mod.AdEventType,
      RewardedAdEventType: mod.RewardedAdEventType,
      AppState: mod.AppState,
    };
  } catch (error) {
    console.log("Google Mobile Ads module failed to load:", (error as Error).message);
    _adsLoading = false;
  }
}

let isInitialized = false;
let _onInitCallbacks: (() => void)[] = [];

export const onAdsReady = (callback: () => void) => {
  if (isInitialized) {
    callback();
    return () => {};
  }
  _onInitCallbacks.push(callback);
  return () => {
    _onInitCallbacks = _onInitCallbacks.filter((cb) => cb !== callback);
  };
};

export const isAdsInitialized = () => isInitialized;

export const requestTrackingPermission = async (): Promise<boolean> => {
  if (Platform.OS === "web") return true;
  if (Platform.OS !== "ios") return true;

  try {
    if (!getTrackingPermissionsAsync) return false;
    const { status } = await getTrackingPermissionsAsync();
    if (status === "undetermined") {
      const { status: newStatus } = await requestTrackingPermissionsAsync();
      return newStatus === "granted";
    }
    return status === "granted";
  } catch (error: any) {
    console.error("ATT: Failed to request tracking permission:", error);
    return false;
  }
};

export const initializeMobileAds = async () => {
  if (Platform.OS === "web") return;

  try {
    await requestTrackingPermission();
  } catch (error: any) {
    console.error("ATT: Failed to request tracking permission:", error);
  }

  loadAds();
  if (!_ads) {
    console.log("ads.ts: _ads module not loaded, cannot initialize");
    return;
  }
  if (isInitialized) return;

  try {
    const requestConfiguration: any = {
      maxAdContentRating: _ads.MaxAdContentRating.G,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    };

    await _ads.mobileAds().setRequestConfiguration(requestConfiguration);
    await _ads.mobileAds().initialize();
    isInitialized = true;
    console.log("ads.ts: Mobile Ads SDK initialized successfully");
    _onInitCallbacks.forEach((cb) => cb());
    _onInitCallbacks = [];
  } catch (error: any) {
    console.error("Failed to initialize mobile ads:", error);
  }
};

let _interstitial: any = null;
let _interstitialLoading = false;

export const loadInterstitial = async () => {
  if (Platform.OS === "web" || isExpoGo) return;
  if (!_ads || !isInitialized) {
    console.log("ads.ts: Cannot load interstitial - SDK not ready");
    return;
  }
  if (_interstitialLoading || (_interstitial && !_interstitial._failed)) return;

  try {
    _interstitialLoading = true;
    const adUnitId = getInterstitialAdUnitId();
    console.log("ads.ts: Loading interstitial ad:", adUnitId);
    _interstitial = _ads.InterstitialAd.createForRequest(adUnitId);

    _interstitial.addAdEventListener(_ads.AdEventType.LOADED, () => {
      console.log("ads.ts: Interstitial ad loaded");
      _interstitialLoading = false;
    });

    _interstitial.addAdEventListener(_ads.AdEventType.ERROR, (error: any) => {
      console.log("ads.ts: Interstitial ad error:", error);
      _interstitialLoading = false;
    });

    _interstitial.addAdEventListener(_ads.AdEventType.CLOSED, () => {
      console.log("ads.ts: Interstitial ad closed, loading next");
      _interstitialLoading = false;
      _interstitial = null;
      loadInterstitial();
    });

    await _interstitial.load();
  } catch (error: any) {
    console.error("ads.ts: Failed to load interstitial:", error);
    _interstitialLoading = false;
  }
};

export const showInterstitial = async (): Promise<boolean> => {
  if (Platform.OS === "web" || isExpoGo) return false;
  if (!_interstitial) {
    console.log("ads.ts: No interstitial ready, loading one");
    loadInterstitial();
    return false;
  }

  try {
    await _interstitial.show();
    console.log("ads.ts: Interstitial ad shown");
    return true;
  } catch (error: any) {
    console.error("ads.ts: Failed to show interstitial:", error);
    return false;
  }
};

let _appOpen: any = null;
let _appOpenLoading = false;
let _lastAdShowTime = 0;
const MIN_AD_INTERVAL = 60000;

export const loadAppOpenAd = async () => {
  if (Platform.OS === "web" || isExpoGo) return;
  if (!_ads || !isInitialized) return;
  if (_appOpenLoading || _appOpen) return;

  try {
    _appOpenLoading = true;
    const adUnitId = getAppOpenAdUnitId();
    console.log("ads.ts: Loading app open ad:", adUnitId);
    _appOpen = _ads.AppOpenAd.createForRequest(adUnitId);

    _appOpen.addAdEventListener(_ads.AdEventType.LOADED, () => {
      console.log("ads.ts: App open ad loaded");
      _appOpenLoading = false;
    });

    _appOpen.addAdEventListener(_ads.AdEventType.ERROR, (error: any) => {
      console.log("ads.ts: App open ad error:", error);
      _appOpenLoading = false;
      _appOpen = null;
    });

    _appOpen.addAdEventListener(_ads.AdEventType.CLOSED, () => {
      console.log("ads.ts: App open ad closed, loading next");
      _appOpenLoading = false;
      _appOpen = null;
      _lastAdShowTime = Date.now();
      loadAppOpenAd();
    });

    await _appOpen.load();
  } catch (error: any) {
    console.error("ads.ts: Failed to load app open ad:", error);
    _appOpenLoading = false;
  }
};

export const showAppOpenAd = async (): Promise<boolean> => {
  if (Platform.OS === "web" || isExpoGo) return false;
  if (!_ads || !isInitialized) return false;
  if (Date.now() - _lastAdShowTime < MIN_AD_INTERVAL) return false;
  if (!_appOpen) {
    loadAppOpenAd();
    return false;
  }

  try {
    await _appOpen.show();
    console.log("ads.ts: App open ad shown");
    return true;
  } catch (error: any) {
    console.error("ads.ts: Failed to show app open ad:", error);
    return false;
  }
};

// ─── Rewarded Ad ──────────────────────────────────────────────────────────────

let _rewarded: any = null;
let _rewardedLoading = false;
let _rewardedCallbacks: { onEarned?: () => void; onDismissed?: () => void } = {};

export const loadRewarded = async () => {
  if (Platform.OS === "web" || isExpoGo) return;
  if (!_ads || !isInitialized) {
    console.log("ads.ts: Cannot load rewarded - SDK not ready");
    return;
  }
  if (_rewardedLoading || _rewarded) return;

  try {
    _rewardedLoading = true;
    const adUnitId = getRewardedAdUnitId();
    console.log("ads.ts: Loading rewarded ad:", adUnitId);
    _rewarded = _ads.RewardedAd.createForRequest(adUnitId);

    _rewarded.addAdEventListener(_ads.RewardedAdEventType.EARNED_REWARD, () => {
      console.log("ads.ts: Rewarded ad - user earned reward");
      _rewardedCallbacks.onEarned?.();
    });

    _rewarded.addAdEventListener(_ads.AdEventType.LOADED, () => {
      console.log("ads.ts: Rewarded ad loaded");
      _rewardedLoading = false;
    });

    _rewarded.addAdEventListener(_ads.AdEventType.ERROR, (error: any) => {
      console.log("ads.ts: Rewarded ad error:", error);
      _rewardedLoading = false;
      _rewarded = null;
    });

    _rewarded.addAdEventListener(_ads.AdEventType.CLOSED, () => {
      console.log("ads.ts: Rewarded ad closed");
      _rewardedLoading = false;
      _rewarded = null;
      _rewardedCallbacks.onDismissed?.();
      _rewardedCallbacks = {};
      loadRewarded();
    });

    await _rewarded.load();
  } catch (error: any) {
    console.error("ads.ts: Failed to load rewarded ad:", error);
    _rewardedLoading = false;
  }
};

export const showRewarded = async (
  callbacks?: { onEarned?: () => void; onDismissed?: () => void }
): Promise<boolean> => {
  if (Platform.OS === "web" || isExpoGo) return false;
  if (!_ads || !isInitialized) return false;
  if (!_rewarded) {
    console.log("ads.ts: No rewarded ad ready, loading one");
    loadRewarded();
    return false;
  }

  _rewardedCallbacks = callbacks || {};

  try {
    await _rewarded.show();
    console.log("ads.ts: Rewarded ad shown");
    return true;
  } catch (error: any) {
    console.error("ads.ts: Failed to show rewarded ad:", error);
    _rewardedCallbacks = {};
    return false;
  }
};

export const isRewardedReady = (): boolean => {
  return !!_rewarded;
};
