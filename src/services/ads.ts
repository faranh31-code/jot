import { Platform } from "react-native";
import {
  getInterstitialAdUnitId,
  getAppOpenAdUnitId,
  getRewardedAdUnitId,
  getRewardedInterstitialAdUnitId,
} from "../constants/admob";
import { trackEvent } from "./analytics";

let getTrackingPermissionsAsync: any = null;
let requestTrackingPermissionsAsync: any = null;
try {
  const attModule = require("expo-tracking-transparency");
  getTrackingPermissionsAsync = attModule.getTrackingPermissionsAsync;
  requestTrackingPermissionsAsync = attModule.requestTrackingPermissionsAsync;
} catch (e) {
  console.log("ads.ts: expo-tracking-transparency not available");
}

const isExpoGo = (globalThis as any).expo?.modules?.ExponentConstants?.appOwnership === "expo";

let _ads: any = null;
let _adsLoading = false;

function loadAds() {
  if (_ads || _adsLoading || Platform.OS === "web" || isExpoGo) return;
  _adsLoading = true;
  try {
    const mod = require("react-native-google-mobile-ads");
    _ads = {
      mobileAds: mod.default ?? mod.MobileAds,
      MaxAdContentRating: mod.MaxAdContentRating,
      RequestConfiguration: mod.RequestConfiguration,
      InterstitialAd: mod.InterstitialAd,
      RewardedAd: mod.RewardedAd,
      RewardedInterstitialAd: mod.RewardedInterstitialAd,
      AppOpenAd: mod.AppOpenAd,
      AdEventType: mod.AdEventType,
      RewardedAdEventType: mod.RewardedAdEventType,
      AppState: mod.AppState,
      AdsConsent: mod.AdsConsent,
      AdsConsentStatus: mod.AdsConsentStatus,
    };
    if (!_ads.mobileAds || !_ads.InterstitialAd) {
      console.log("Google Mobile Ads module loaded but native bindings are unavailable");
      _ads = null;
    }
  } catch (error) {
    console.log("Google Mobile Ads module failed to load:", (error as Error).message);
    _ads = null;
  } finally {
    _adsLoading = false;
  }
}

export const isAdsModuleAvailable = (): boolean => !!_ads && isInitialized;

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

export const ADS_DIAGNOSTICS_ENABLED = process.env.EXPO_PUBLIC_AD_DEBUG === "1";

const _configuredTestDeviceIds = (process.env.EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS || "")
  .split(",")
  .map((id: string) => id.trim())
  .filter(Boolean);

export const getConfiguredTestDeviceIds = (): string[] => _configuredTestDeviceIds;

export interface AdDiagnostic {
  time: string;
  level: "info" | "warn" | "error";
  message: string;
}

let _diagnostics: AdDiagnostic[] = [];
const _diagListeners = new Set<() => void>();

export function adDiag(level: AdDiagnostic["level"], message: string) {
  const entry: AdDiagnostic = {
    time: new Date().toLocaleTimeString(),
    level,
    message,
  };
  _diagnostics = [..._diagnostics.slice(-39), entry];
  _diagListeners.forEach((l) => l());
}

export function subscribeAdDiagnostics(cb: () => void): () => void {
  _diagListeners.add(cb);
  return () => {
    _diagListeners.delete(cb);
  };
}

export function getAdDiagnostics(): AdDiagnostic[] {
  return _diagnostics;
}

export function formatAdError(error: any): string {
  if (!error) return "unknown error";
  const code = error?.code ?? error?.nativeCode;
  const domain = error?.domain;
  const message = error?.message ?? error?.description ?? JSON.stringify(error);
  const parts = [
    code !== undefined && code !== null ? `code=${code}` : null,
    domain ? `domain=${domain}` : null,
    message ? `${message}` : null,
  ].filter(Boolean);
  return parts.join(" ") || "unknown error";
}

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

// UMP's requestInfoUpdate() must never block SDK init: if it hangs (e.g. slow
// network), fall through to mobileAds().initialize() so ads can still serve.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.log(`ads.ts: ${label} timed out after ${ms}ms`);
      resolve(null);
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        console.log(`ads.ts: ${label} failed:`, formatAdError(error));
        resolve(null);
      });
  });
}

export const initializeMobileAds = async () => {
  if (Platform.OS === "web") return;

  if (Platform.OS === "ios") {
    requestTrackingPermission().catch((error: any) =>
      console.error("ATT: Failed to request tracking permission:", error)
    );
  }

  loadAds();
  if (!_ads) {
    console.log("ads.ts: _ads module not loaded, cannot initialize");
    adDiag("error", "_ads module not loaded, cannot initialize");
    return;
  }
  if (isInitialized) return;

  try {
    if (_ads.AdsConsent) {
      adDiag("info", "Requesting UMP consent info...");
      const consentInfo: any = await withTimeout(
        _ads.AdsConsent.requestInfoUpdate(),
        5000,
        "UMP requestInfoUpdate"
      );
      if (consentInfo) {
        adDiag(
          "info",
          `UMP consent: status=${consentInfo.status} canRequestAds=${consentInfo.canRequestAds} formAvailable=${consentInfo.isConsentFormAvailable} privacyOptions=${consentInfo.privacyOptionsRequirementStatus}`
        );
        if (
          consentInfo.isConsentFormAvailable &&
          (consentInfo.status === "UNKNOWN" || consentInfo.status === "REQUIRED")
        ) {
          adDiag("info", "UMP consent form required, loading form...");
          const formResult = await _ads.AdsConsent.loadAndShowConsentFormIfRequired();
          adDiag(
            "info",
            `UMP consent form closed: status=${formResult.status} canRequestAds=${formResult.canRequestAds}`
          );
        }
      } else {
        adDiag("warn", "UMP requestInfoUpdate timed out after 5s, proceeding without consent check");
      }
    }

    const requestConfiguration: any = {
      maxAdContentRating: _ads.MaxAdContentRating.G,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      ...(getConfiguredTestDeviceIds().length
        ? { testDeviceIdentifiers: getConfiguredTestDeviceIds() }
        : {}),
    };

    adDiag(
      "info",
      getConfiguredTestDeviceIds().length
        ? `Using test device identifiers: ${getConfiguredTestDeviceIds().join(", ")}`
        : "No test device identifiers configured (serving reactively)"
    );

    await _ads.mobileAds().setRequestConfiguration(requestConfiguration);
    adDiag("info", "Calling mobileAds().initialize()...");
    await _ads.mobileAds().initialize();
    isInitialized = true;
    adDiag("info", "Mobile Ads SDK initialized successfully");
    console.log("ads.ts: Mobile Ads SDK initialized successfully");
    _onInitCallbacks.forEach((cb) => cb());
    _onInitCallbacks = [];
  } catch (error: any) {
    adDiag("error", `Failed to initialize mobile ads: ${formatAdError(error)}`);
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
  if (_interstitialLoading || _interstitial) return;

  try {
    _interstitialLoading = true;
    const adUnitId = getInterstitialAdUnitId();
    console.log("ads.ts: Loading interstitial ad:", adUnitId);
    _interstitial = _ads.InterstitialAd.createForAdRequest(adUnitId);

    _interstitial.addAdEventListener(_ads.AdEventType.LOADED, () => {
      console.log("ads.ts: Interstitial ad loaded");
      adDiag("info", "Interstitial ad loaded");
      _interstitialLoading = false;
    });

    _interstitial.addAdEventListener(_ads.AdEventType.ERROR, (error: any) => {
      const detail = formatAdError(error);
      console.log("ads.ts: Interstitial ad error:", error);
      adDiag("error", `Interstitial ad error: ${detail}`);
      _interstitialLoading = false;
      _interstitial = null;
      setTimeout(loadInterstitial, 15000);
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
  if (!fullscreenCooldownElapsed()) return false;
  if (!_interstitial) {
    console.log("ads.ts: No interstitial ready, loading one");
    loadInterstitial();
    return false;
  }

  try {
    _lastAdShowTime = Date.now();
    await _interstitial.show();
    console.log("ads.ts: Interstitial ad shown");
    trackEvent({ event: "interstitial_ad_shown" });
    return true;
  } catch (error: any) {
    console.error("ads.ts: Failed to show interstitial:", error);
    _interstitial = null;
    _interstitialLoading = false;
    loadInterstitial();
    return false;
  }
};

let _appOpen: any = null;
let _appOpenLoading = false;
let _lastAdShowTime = 0;
const MIN_AD_INTERVAL = 10000;

function fullscreenCooldownElapsed(): boolean {
  return Date.now() - _lastAdShowTime >= MIN_AD_INTERVAL;
}

export const loadAppOpenAd = async () => {
  if (Platform.OS === "web" || isExpoGo) return;
  if (!_ads || !isInitialized) return;
  if (_appOpenLoading || _appOpen) return;

  try {
    _appOpenLoading = true;
    const adUnitId = getAppOpenAdUnitId();
    console.log("ads.ts: Loading app open ad:", adUnitId);
    _appOpen = _ads.AppOpenAd.createForAdRequest(adUnitId);

    _appOpen.addAdEventListener(_ads.AdEventType.LOADED, () => {
      console.log("ads.ts: App open ad loaded");
      adDiag("info", "App open ad loaded");
      _appOpenLoading = false;
    });

    _appOpen.addAdEventListener(_ads.AdEventType.ERROR, (error: any) => {
      const detail = formatAdError(error);
      console.log("ads.ts: App open ad error:", error);
      adDiag("error", `App open ad error: ${detail}`);
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
  if (!fullscreenCooldownElapsed()) return false;
  if (!_appOpen) {
    loadAppOpenAd();
    return false;
  }

  try {
    _lastAdShowTime = Date.now();
    await _appOpen.show();
    console.log("ads.ts: App open ad shown");
    trackEvent({ event: "app_open_ad_shown" });
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
    _rewarded = _ads.RewardedAd.createForAdRequest(adUnitId);

    _rewarded.addAdEventListener(_ads.RewardedAdEventType.EARNED_REWARD, () => {
      console.log("ads.ts: Rewarded ad - user earned reward");
      _rewardedCallbacks.onEarned?.();
    });

    _rewarded.addAdEventListener(_ads.RewardedAdEventType.LOADED, () => {
      console.log("ads.ts: Rewarded ad loaded");
      adDiag("info", "Rewarded ad loaded");
      _rewardedLoading = false;
    });

    _rewarded.addAdEventListener(_ads.AdEventType.ERROR, (error: any) => {
      const detail = formatAdError(error);
      console.log("ads.ts: Rewarded ad error:", error);
      adDiag("error", `Rewarded ad error: ${detail}`);
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

// ─── Rewarded Interstitial Ad ─────────────────────────────────────────────────

let _rewardedInterstitial: any = null;
let _rewardedInterstitialLoading = false;
let _rewardedInterstitialCallbacks: { onEarned?: () => void; onDismissed?: () => void } = {};

export const loadRewardedInterstitial = async () => {
  if (Platform.OS === "web" || isExpoGo) return;
  if (!_ads || !isInitialized) {
    console.log("ads.ts: Cannot load rewarded interstitial - SDK not ready");
    return;
  }
  if (_rewardedInterstitialLoading || _rewardedInterstitial) return;

  try {
    _rewardedInterstitialLoading = true;
    const adUnitId = getRewardedInterstitialAdUnitId();
    console.log("ads.ts: Loading rewarded interstitial ad:", adUnitId);
    _rewardedInterstitial = _ads.RewardedInterstitialAd.createForAdRequest(adUnitId);

    _rewardedInterstitial.addAdEventListener(_ads.RewardedAdEventType.EARNED_REWARD, () => {
      console.log("ads.ts: Rewarded interstitial ad - user earned reward");
      _rewardedInterstitialCallbacks.onEarned?.();
    });

    _rewardedInterstitial.addAdEventListener(_ads.RewardedAdEventType.LOADED, () => {
      console.log("ads.ts: Rewarded interstitial ad loaded");
      adDiag("info", "Rewarded interstitial ad loaded");
      _rewardedInterstitialLoading = false;
    });

    _rewardedInterstitial.addAdEventListener(_ads.AdEventType.ERROR, (error: any) => {
      const detail = formatAdError(error);
      console.log("ads.ts: Rewarded interstitial ad error:", error);
      adDiag("error", `Rewarded interstitial ad error: ${detail}`);
      _rewardedInterstitialLoading = false;
      _rewardedInterstitial = null;
      setTimeout(loadRewardedInterstitial, 15000);
    });

    _rewardedInterstitial.addAdEventListener(_ads.AdEventType.CLOSED, () => {
      console.log("ads.ts: Rewarded interstitial ad closed");
      _rewardedInterstitialLoading = false;
      _rewardedInterstitial = null;
      _rewardedInterstitialCallbacks.onDismissed?.();
      _rewardedInterstitialCallbacks = {};
      loadRewardedInterstitial();
    });

    await _rewardedInterstitial.load();
  } catch (error: any) {
    console.error("ads.ts: Failed to load rewarded interstitial ad:", error);
    _rewardedInterstitialLoading = false;
  }
};

export const showRewardedInterstitial = async (
  callbacks?: { onEarned?: () => void; onDismissed?: () => void }
): Promise<boolean> => {
  if (Platform.OS === "web" || isExpoGo) return false;
  if (!_ads || !isInitialized) return false;
  if (!_rewardedInterstitial) {
    console.log("ads.ts: No rewarded interstitial ad ready, loading one");
    loadRewardedInterstitial();
    return false;
  }

  _rewardedInterstitialCallbacks = callbacks || {};

  try {
    await _rewardedInterstitial.show();
    console.log("ads.ts: Rewarded interstitial ad shown");
    trackEvent({ event: "rewarded_interstitial_ad_shown" });
    return true;
  } catch (error: any) {
    console.error("ads.ts: Failed to show rewarded interstitial ad:", error);
    _rewardedInterstitialCallbacks = {};
    return false;
  }
};

export const isRewardedInterstitialReady = (): boolean => {
  return !!_rewardedInterstitial;
};
