import { Platform } from "react-native";

export const SubscriptionConfig = {
  iosApiKey: "appl_domEJJjtYWUBNLiMEpKpVPIRhLW",
  androidApiKey: "goog_OCuxlMUseJWHiEaRlqUsTCPMjfP",
  entitlementId: "Text Saver Pro",
} as const;

export function getApiKey(): string {
  return Platform.OS === "ios"
    ? SubscriptionConfig.iosApiKey
    : SubscriptionConfig.androidApiKey;
}
