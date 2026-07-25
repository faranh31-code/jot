import React from "react";
import { View, StyleSheet, Platform } from "react-native";

interface AdBannerProps {
  isPro: boolean;
  isDark?: boolean;
}

export default function AdBanner({ isPro, isDark }: AdBannerProps) {
  if (isPro || Platform.OS === "web" || __DEV__) return null;

  const [AdComponent, setAdComponent] = React.useState<any>(null);
  const [adUnitId, setAdUnitId] = React.useState<string>("");
  const loaded = React.useRef(false);

  React.useEffect(() => {
    if (isPro || loaded.current || __DEV__) return;
    loaded.current = true;

    (async () => {
      try {
        const ads = await import("react-native-google-mobile-ads");
        const { BannerAd, BannerAdSize } = ads;
        if (!BannerAd || !BannerAdSize) return;

        const { getBannerAdUnitId } = await import("../services/ads");
        const unitId = getBannerAdUnitId();
        setAdUnitId(unitId);
        setAdComponent({ BannerAd, BannerAdSize });
      } catch {
        console.warn("[AdBanner] Native ads module not available");
      }
    })();
  }, [isPro]);

  if (!AdComponent) return null;

  const { BannerAd, BannerAdSize } = AdComponent;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#0f0f23" : "#f5f5f5",
          borderBottomColor: isDark ? "#2a2a5a" : "#e0e0e0",
        },
      ]}
    >
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => console.log("[AdBanner] Ad loaded")}
        onAdFailedToLoad={(error: any) => console.warn("[AdBanner] Failed:", error.message)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
});
