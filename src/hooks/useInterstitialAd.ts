import { useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import { loadInterstitial, showInterstitial, onAdsReady, isAdsInitialized } from "../services/ads";

const isExpoGo = (global as any).expo?.modules?.ExponentConstants?.appOwnership === "expo";

export function useInterstitialAd() {
  const actionCount = useRef(0);

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
    actionCount.current += 1;
    if (actionCount.current % 2 === 0) {
      return await showInterstitial();
    }
    return false;
  }, []);

  const showNow = useCallback(async (): Promise<boolean> => {
    return await showInterstitial();
  }, []);

  return { maybeShowAfterAction, showNow };
}
