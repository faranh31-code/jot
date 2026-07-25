import { useCallback } from "react";

export function useAdRewarded(isPro: boolean) {
  const showRewardAd = useCallback(async (): Promise<boolean> => {
    return false;
  }, []);
  return { isAdLoaded: false, showRewardAd };
}
