import { Platform } from "react-native";

export const SubscriptionConfig = {
  iosApiKey: "REPLACE_WITH_REVENUECAT_IOS_KEY",
  androidApiKey: "REPLACE_WITH_REVENUECAT_ANDROID_KEY",
  entitlementId: "Text Saver Pro",
} as const;

export function getApiKey(): string {
  return Platform.OS === "ios"
    ? SubscriptionConfig.iosApiKey
    : SubscriptionConfig.androidApiKey;
}
