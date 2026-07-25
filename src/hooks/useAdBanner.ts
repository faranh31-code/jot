import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { getBannerAdUnitId } from "../services/ads";

export function useAdBanner(isPro: boolean) {
  const [adUnitId, setAdUnitId] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || isPro || Platform.OS === "web" || __DEV__) return;
    initialized.current = true;

    (async () => {
      try {
        const unitId = getBannerAdUnitId();
        setAdUnitId(unitId);
        setIsLoaded(true);
      } catch {
        console.warn("[AdBanner] Failed to get ad unit ID");
      }
    })();
  }, [isPro]);

  return { adUnitId, isLoaded };
}
