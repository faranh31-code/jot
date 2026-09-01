import { useEffect, useCallback, useState } from "react";
import { Platform } from "react-native";
import { loadRewarded, showRewarded, isRewardedReady, onAdsReady, isAdsInitialized } from "../services/ads";

const isExpoGo = (global as any).expo?.modules?.ExponentConstants?.appOwnership === "expo";

export function useRewardedAd() {
  const [isReady, setIsReady] = useState(false);
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web" || isExpoGo) return;

    const load = () => {
      loadRewarded().then(() => setIsReady(isRewardedReady()));
    };

    if (isAdsInitialized()) {
      load();
    } else {
      const unsub = onAdsReady(load);
      return unsub;
    }
  }, []);

  const show = useCallback(
    (callbacks?: { onEarned?: () => void; onDismissed?: () => void }): Promise<boolean> => {
      if (Platform.OS === "web" || isExpoGo) return Promise.resolve(false);
      setIsShowing(true);
      return showRewarded({
        onEarned: () => {
          setIsReady(false);
          setIsShowing(false);
          callbacks?.onEarned?.();
        },
        onDismissed: () => {
          setIsReady(false);
          setIsShowing(false);
          callbacks?.onDismissed?.();
          loadRewarded().then(() => setIsReady(isRewardedReady()));
        },
      });
    },
    []
  );

  return { isReady, isShowing, show };
}
