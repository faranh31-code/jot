import { Platform } from "react-native";

const FORCE_TEST_ADS = process.env.EXPO_PUBLIC_USE_TEST_ADS === "1";
const USE_TEST_ADS = __DEV__ || FORCE_TEST_ADS;

const TEST_AD_UNITS = {
  banner:
    Platform.OS === "ios"
      ? "ca-app-pub-3940256099942544/2934735716"
      : "ca-app-pub-3940256099942544/6300978111",
  interstitial:
    Platform.OS === "ios"
      ? "ca-app-pub-3940256099942544/4411468910"
      : "ca-app-pub-3940256099942544/1033173712",
  rewarded:
    Platform.OS === "ios"
      ? "ca-app-pub-3940256099942544/1712485313"
      : "ca-app-pub-3940256099942544/5224354917",
  appOpen:
    Platform.OS === "ios"
      ? "ca-app-pub-3940256099942544/5575463023"
      : "ca-app-pub-3940256099942544/9257395921",
  rewardedInterstitial:
    Platform.OS === "ios"
      ? "ca-app-pub-3940256099942544/6978759866"
      : "ca-app-pub-3940256099942544/5354046379",
  native:
    Platform.OS === "ios"
      ? "ca-app-pub-3940256099942544/3986624511"
      : "ca-app-pub-3940256099942544/2247696110",
};

export const isUsingTestAds = () => USE_TEST_ADS;

export const ADMOB_CONFIG = {
  android: {
    appId: "ca-app-pub-4386055252112057~2456607131",
    banner: "ca-app-pub-4386055252112057/5686966207",
    interstitial: "ca-app-pub-4386055252112057/6226678798",
    rewarded: "ca-app-pub-4386055252112057/7320585844",
    appOpen: "ca-app-pub-4386055252112057/4913597126",
    rewardedInterstitial: "ca-app-pub-4386055252112057/4743785043",
    native: "ca-app-pub-4386055252112057/3202638514",
  },
  ios: {
    appId: "ca-app-pub-4386055252112057~7597253176",
    banner: "ca-app-pub-4386055252112057/6498141532",
    interstitial: "ca-app-pub-4386055252112057/7156617087",
    rewarded: "ca-app-pub-4386055252112057/2988079850",
    appOpen: "ca-app-pub-4386055252112057/3520624403",
    rewardedInterstitial: "ca-app-pub-4386055252112057/6873281055",
    native: "ca-app-pub-4386055252112057/7855190238",
  },
} as const;

export const getBannerAdUnitId = () => {
  if (USE_TEST_ADS) return TEST_AD_UNITS.banner;
  return Platform.OS === "ios" ? ADMOB_CONFIG.ios.banner : ADMOB_CONFIG.android.banner;
};

export const getInterstitialAdUnitId = () => {
  if (USE_TEST_ADS) return TEST_AD_UNITS.interstitial;
  return Platform.OS === "ios" ? ADMOB_CONFIG.ios.interstitial : ADMOB_CONFIG.android.interstitial;
};

export const getRewardedAdUnitId = () => {
  if (USE_TEST_ADS) return TEST_AD_UNITS.rewarded;
  return Platform.OS === "ios" ? ADMOB_CONFIG.ios.rewarded : ADMOB_CONFIG.android.rewarded;
};

export const getAppOpenAdUnitId = () => {
  if (USE_TEST_ADS) return TEST_AD_UNITS.appOpen;
  return Platform.OS === "ios" ? ADMOB_CONFIG.ios.appOpen : ADMOB_CONFIG.android.appOpen;
};

export const getRewardedInterstitialAdUnitId = () => {
  if (USE_TEST_ADS) return TEST_AD_UNITS.rewardedInterstitial;
  return Platform.OS === "ios"
    ? ADMOB_CONFIG.ios.rewardedInterstitial
    : ADMOB_CONFIG.android.rewardedInterstitial;
};

export const getNativeAdUnitId = () => {
  if (USE_TEST_ADS) return TEST_AD_UNITS.native;
  return Platform.OS === "ios" ? ADMOB_CONFIG.ios.native : ADMOB_CONFIG.android.native;
};
