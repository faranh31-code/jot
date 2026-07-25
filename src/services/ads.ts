import { Platform } from "react-native";

export const AdConfig = {
  iosAppId: "ca-app-pub-4386055252112057~7597253176",
  androidAppId: "ca-app-pub-4386055252112057~2456607131",
  adUnitIds: {
    banner: {
      ios: "ca-app-pub-4386055252112057/6498141532",
      android: "ca-app-pub-4386055252112057/5686966207",
    },
    rewarded: {
      ios: "ca-app-pub-4386055252112057/2988079850",
      android: "ca-app-pub-4386055252112057/7320585844",
    },
    interstitial: {
      ios: "ca-app-pub-4386055252112057/7156617087",
      android: "ca-app-pub-4386055252112057/6226678798",
    },
    appOpen: {
      ios: "ca-app-pub-4386055252112057/3520624403",
      android: "ca-app-pub-4386055252112057/4913597126",
    },
  },
} as const;

export function getBannerAdUnitId(): string {
  if (__DEV__) return "ca-app-pub-3940256099942544/6300978111";
  return Platform.OS === "ios"
    ? AdConfig.adUnitIds.banner.ios
    : AdConfig.adUnitIds.banner.android;
}

export function getRewardedAdUnitId(): string {
  if (__DEV__) return "ca-app-pub-3940256099942544/5224354917";
  return Platform.OS === "ios"
    ? AdConfig.adUnitIds.rewarded.ios
    : AdConfig.adUnitIds.rewarded.android;
}

export function getInterstitialAdUnitId(): string {
  if (__DEV__) return "ca-app-pub-3940256099942544/1033173712";
  return Platform.OS === "ios"
    ? AdConfig.adUnitIds.interstitial.ios
    : AdConfig.adUnitIds.interstitial.android;
}
