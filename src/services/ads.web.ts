// Web build stub — mirrors AdBanner.web.tsx's pattern. The native AdMob SDK
// (react-native-google-mobile-ads) can't be imported on web at all, so this
// file gives Metro's web bundle a no-op implementation instead of crashing
// at import time. Native (iOS/Android) builds are unaffected: Metro resolves
// ads.ts for those platforms exactly as before.
export const onAdsReady = (_callback: () => void) => () => {};
export const isAdsInitialized = () => false;
export const requestTrackingPermission = async (): Promise<boolean> => false;
export const initializeMobileAds = async () => {};
export const loadInterstitial = async () => {};
export const showInterstitial = async (): Promise<boolean> => false;
export const loadAppOpenAd = async () => {};
export const showAppOpenAd = async (): Promise<boolean> => false;
export const loadRewarded = async () => {};
export const showRewarded = async (
  _callbacks?: { onEarned?: () => void; onDismissed?: () => void }
): Promise<boolean> => false;
export const isRewardedReady = (): boolean => false;
export const isAdsModuleAvailable = (): boolean => false;
export const ADS_DIAGNOSTICS_ENABLED = false;
export const adDiag = () => {};
export const subscribeAdDiagnostics = () => () => {};
export const getAdDiagnostics = (): unknown[] => [];
export const formatAdError = (error: any): string => String(error);
export const getConfiguredTestDeviceIds = (): string[] => [];
