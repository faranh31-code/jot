import { useCallback } from "react";

export function useAdInterstitial(isPro: boolean) {
  const showInterstitial = useCallback(async (): Promise<boolean> => {
    return false;
  }, []);
  return { isAdLoaded: false, showInterstitial };
}
