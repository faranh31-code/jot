import { useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import { getRewardedAdUnitId } from "../services/ads";

export function useAdRewarded(isPro: boolean) {
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const rewardedAdRef = useRef<any>(null);
  const listenersRef = useRef<(() => void)[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || isPro || Platform.OS === "web" || __DEV__) return;
    initialized.current = true;

    (async () => {
      try {
        const ads = await import("react-native-google-mobile-ads");
        const unitId = getRewardedAdUnitId();
        const ad = ads.RewardedAd.createForAdRequest(unitId);
        rewardedAdRef.current = ad;

        const loaded = ad.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
          setIsAdLoaded(true);
        });
        const closed = ad.addAdEventListener(ads.RewardedAdEventType.CLOSED, () => {
          setIsAdLoaded(false);
          ad.load();
        });

        listenersRef.current = [loaded, closed];
        ad.load();
      } catch {
        console.warn("[RewardedAd] Native module not available in Expo Go");
      }
    })();

    return () => {
      listenersRef.current.forEach((unsub) => unsub());
      listenersRef.current = [];
    };
  }, [isPro]);

  const showRewardAd = useCallback(async (): Promise<boolean> => {
    if (isPro) return false;
    if (!isAdLoaded || !rewardedAdRef.current) return false;
    try {
      await rewardedAdRef.current.show();
      return true;
    } catch {
      return false;
    }
  }, [isAdLoaded, isPro]);

  return { isAdLoaded, showRewardAd };
}
