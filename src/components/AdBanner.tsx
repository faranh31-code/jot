import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { getBannerAdUnitId } from "../services/ads";

interface AdBannerProps {
  isPro: boolean;
  isDark?: boolean;
}

export default function AdBanner({ isPro, isDark }: AdBannerProps) {
  const [AdComponent, setAdComponent] = useState<any>(null);
  const [adUnitId, setAdUnitId] = useState<string>("");
  const loaded = useRef(false);

  useEffect(() => {
    if (isPro || Platform.OS === "web" || loaded.current) return;
    loaded.current = true;

    (async () => {
      try {
        const ads = await import("react-native-google-mobile-ads");
        const unitId = getBannerAdUnitId();
        setAdUnitId(unitId);
        setAdComponent({ BannerAd: ads.BannerAd, BannerAdSize: ads.BannerAdSize });
      } catch {
        console.warn("[AdBanner] Native ads module not available in Expo Go");
      }
    })();
  }, [isPro]);

  if (isPro || !AdComponent) return null;

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
