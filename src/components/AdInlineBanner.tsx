import { getBannerAdUnitId } from "../constants/admob";
import React, { useEffect, useState, useCallback } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { onAdsReady, isAdsInitialized } from "../services/ads";
import { Colors, BorderRadius } from "../constants/theme";

const isExpoGo = (global as any).expo?.modules?.ExponentConstants?.appOwnership === "expo";

let BannerAd: any = null;
let BannerAdSize: any = null;

if (Platform.OS !== "web" && !isExpoGo) {
  try {
    const adsModule = require("react-native-google-mobile-ads");
    BannerAd = adsModule.BannerAd;
    BannerAdSize = adsModule.BannerAdSize;
  } catch (error) {
    console.log("AdInlineBanner: BannerAd not available");
  }
}

interface AdInlineBannerProps {
  isDark?: boolean;
}

const AdInlineBanner: React.FC<AdInlineBannerProps> = ({ isDark }) => {
  const [sdkReady, setSdkReady] = useState(isAdsInitialized());
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    if (isAdsInitialized()) {
      setSdkReady(true);
      return;
    }
    const unsubscribe = onAdsReady(() => {
      setSdkReady(true);
    });
    return unsubscribe;
  }, []);

  const handleAdLoaded = useCallback(() => {
    console.log("AdInlineBanner: Ad loaded");
    setAdLoaded(true);
  }, []);

  const handleAdFailedToLoad = useCallback((error: any) => {
    console.log("AdInlineBanner: Ad failed -", error?.message || error);
  }, []);

  if (Platform.OS === "web" || isExpoGo || !BannerAd || !BannerAdSize || !sdkReady) {
    return null;
  }

  if (adLoaded) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
            borderTopColor: isDark ? Colors.dark.border : Colors.light.border,
            borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
          },
        ]}
      >
        <BannerAd
          unitId={getBannerAdUnitId()}
          size={BannerAdSize.FLUID}
          onAdLoaded={handleAdLoaded}
          onAdFailedToLoad={handleAdFailedToLoad}
        />
      </View>
    );
  }

  return (
    <BannerAd
      unitId={getBannerAdUnitId()}
      size={BannerAdSize.FLUID}
      onAdLoaded={handleAdLoaded}
      onAdFailedToLoad={handleAdFailedToLoad}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
});

export default AdInlineBanner;
