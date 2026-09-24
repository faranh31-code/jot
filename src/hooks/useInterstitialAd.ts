import { useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { loadInterstitial, showInterstitial, onAdsReady, isAdsInitialized } from "../services/ads";

const isExpoGo = (globalThis as any).expo?.modules?.ExponentConstants?.appOwnership === "expo";

export function useInterstitialAd() {
  useEffect(() => {
    if (Platform.OS === "web" || isExpoGo) return;

    const load = () => {
      loadInterstitial();
    };

    if (isAdsInitialized()) {
      load();
    } else {
      const unsub = onAdsReady(load);
      return unsub;
    }
  }, []);

  const maybeShowAfterAction = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web" || isExpoGo) return false;
    return await showInterstitial();
  }, []);

  const showNow = useCallback(async (): Promise<boolean> => {
    return await showInterstitial();
  }, []);

  return { maybeShowAfterAction, showNow };
}
