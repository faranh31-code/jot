import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { SubscriptionConfig } from "../services/subscriptions";

const ENTITLEMENT_ID = SubscriptionConfig.entitlementId;

let PurchasesRef: any = null;
let RevenueCatUIRef: any = null;
let PAYWALL_RESULT_REF: any = null;

interface UseSubscriptionReturn {
  isPro: boolean;
  isLoaded: boolean;
  presentPaywall: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkProStatus: () => Promise<void>;
}

async function loadNativeModules(): Promise<boolean> {
  try {
    const purchasesMod = await import("react-native-purchases");
    PurchasesRef = purchasesMod.default;
    const uiMod = await import("react-native-purchases-ui");
    RevenueCatUIRef = uiMod.default;
    PAYWALL_RESULT_REF = uiMod.PAYWALL_RESULT;
    return true;
  } catch {
    console.warn("[RevenueCat] Native modules not available (Expo Go). Running in degraded mode.");
    return false;
  }
}

export function useSubscription(): UseSubscriptionReturn {
  const [isPro, setIsPro] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    configure();
  }, []);

  async function configure() {
    try {
      const available = await loadNativeModules();
      if (!available || !PurchasesRef) {
        setIsLoaded(true);
        return;
      }
      PurchasesRef.setLogLevel(PurchasesRef.LOG_LEVEL?.VERBOSE ?? 0);
      await PurchasesRef.configure({
        apiKey:
          Platform.OS === "ios"
            ? SubscriptionConfig.iosApiKey
            : SubscriptionConfig.androidApiKey,
      });
      await checkProStatus();
    } catch (err) {
      console.warn("[RevenueCat] Configure failed:", err);
      setIsLoaded(true);
    }
  }

  const checkProStatus = useCallback(async () => {
    try {
      if (!PurchasesRef) {
        setIsLoaded(true);
        return;
      }
      const customerInfo = await PurchasesRef.getCustomerInfo();
      const active =
        typeof customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== "undefined";
      setIsPro(active);
    } catch (err) {
      console.warn("[RevenueCat] getCustomerInfo failed:", err);
      setIsPro(false);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const presentPaywall = useCallback(async (): Promise<boolean> => {
    try {
      if (!RevenueCatUIRef || !PAYWALL_RESULT_REF) {
        console.warn("[RevenueCat] UI not available");
        return false;
      }
      const result = await RevenueCatUIRef.presentPaywall();
      switch (result) {
        case PAYWALL_RESULT_REF.PURCHASED:
        case PAYWALL_RESULT_REF.RESTORED:
          await checkProStatus();
          return true;
        default:
          return false;
      }
    } catch (err) {
      console.warn("[RevenueCat] presentPaywall failed:", err);
      return false;
    }
  }, [checkProStatus]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      if (!PurchasesRef) return false;
      const customerInfo = await PurchasesRef.restorePurchases();
      const active =
        typeof customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== "undefined";
      setIsPro(active);
      return active;
    } catch (err) {
      console.warn("[RevenueCat] restorePurchases failed:", err);
      return false;
    }
  }, []);

  return { isPro, isLoaded, presentPaywall, restorePurchases, checkProStatus };
}
