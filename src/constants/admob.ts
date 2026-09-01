import { Platform } from "react-native";

const USE_TEST_ADS = __DEV__;

const TEST_AD_UNITS = {
  banner: "ca-app-pub-3940256099942544/6300978111",
  interstitial: "ca-app-pub-3940256099942544/1033173712",
  rewarded: "ca-app-pub-3940256099942544/5224354917",
  appOpen: "ca-app-pub-3940256099942544/9257395921",
};

export const ADMOB_CONFIG = {
  android: {
    appId: "ca-app-pub-4386055252112057~2456607131",
    banner: "ca-app-pub-4386055252112057/5686966207",
    interstitial: "ca-app-pub-4386055252112057/6226678798",
    rewarded: "ca-app-pub-4386055252112057/7320585844",
    appOpen: "ca-app-pub-4386055252112057/4913597126",
  },
  ios: {
    appId: "ca-app-pub-4386055252112057~7597253176",
    banner: "ca-app-pub-4386055252112057/6498141532",
    interstitial: "ca-app-pub-4386055252112057/7156617087",
    rewarded: "ca-app-pub-4386055252112057/2988079850",
    appOpen: "ca-app-pub-4386055252112057/3520624403",
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
