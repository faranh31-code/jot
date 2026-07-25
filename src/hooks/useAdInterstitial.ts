import { useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import { getInterstitialAdUnitId } from "../services/ads";

export function useAdInterstitial(isPro: boolean) {
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const interstitialRef = useRef<any>(null);
  const listenersRef = useRef<(() => void)[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || isPro || Platform.OS === "web" || __DEV__) return;
    initialized.current = true;

    (async () => {
      try {
        const ads = await import("react-native-google-mobile-ads");
        const unitId = getInterstitialAdUnitId();
        const ad = ads.InterstitialAd.createForAdRequest(unitId);
        interstitialRef.current = ad;

        const loaded = ad.addAdEventListener(ads.InterstitialAdEventType.LOADED, () => {
          setIsAdLoaded(true);
        });
        const closed = ad.addAdEventListener(ads.InterstitialAdEventType.CLOSED, () => {
          setIsAdLoaded(false);
          ad.load();
        });

        listenersRef.current = [loaded, closed];
        ad.load();
      } catch {
        console.warn("[InterstitialAd] Native module not available in Expo Go");
      }
    })();

    return () => {
      listenersRef.current.forEach((unsub) => unsub());
      listenersRef.current = [];
    };
  }, [isPro]);

  const showInterstitial = useCallback(async (): Promise<boolean> => {
    if (isPro) return false;
    if (!isAdLoaded || !interstitialRef.current) return false;
    try {
      await interstitialRef.current.show();
      return true;
    } catch {
      return false;
    }
  }, [isAdLoaded, isPro]);

  return { isAdLoaded, showInterstitial };
}
