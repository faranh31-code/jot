import { getBannerAdUnitId } from "../constants/admob";
import React, { useEffect, useState, useCallback } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { onAdsReady, isAdsInitialized } from "../services/ads";
import { Colors } from "../constants/theme";

const isExpoGo = (global as any).expo?.modules?.ExponentConstants?.appOwnership === "expo";

let BannerAd: any = null;
let BannerAdSize: any = null;

if (Platform.OS !== "web" && !isExpoGo) {
  try {
    const adsModule = require("react-native-google-mobile-ads");
    BannerAd = adsModule.BannerAd;
    BannerAdSize = adsModule.BannerAdSize;
  } catch (error) {
    console.log("BannerAd not available");
  }
}

interface AdBannerProps {
  isDark?: boolean;
  position?: "top" | "bottom";
}

const AdBanner: React.FC<AdBannerProps> = ({ isDark, position = "top" }) => {
  const [sdkReady, setSdkReady] = useState(isAdsInitialized());
  const [adError, setAdError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!sdkReady) return;
    const timeout = setTimeout(() => {
      if (!adLoaded && !adError) {
        console.log(`AdBanner (${position}): Ad loading timed out after 10s`);
        setAdError("Ad loading timeout");
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [sdkReady, adLoaded, adError, position]);

  const handleAdLoaded = useCallback(() => {
    console.log(`AdBanner (${position}): Ad loaded successfully`);
    setAdError(null);
    setAdLoaded(true);
  }, [position]);

  const handleAdFailedToLoad = useCallback((error: any) => {
    console.log(`AdBanner (${position}): Ad failed to load -`, error?.message || error);
    setAdError(error?.message || "Unknown error");
  }, [position]);

  if (Platform.OS === "web" || isExpoGo || !BannerAd || !BannerAdSize) {
    return null;
  }

  if (!sdkReady) {
    return null;
  }

  const unitId = getBannerAdUnitId();
  console.log(`AdBanner (${position}): Rendering banner with unitId:`, unitId);

  return (
    <View
      style={[
        styles.container,
        position === "top" ? styles.topBorder : styles.bottomBorder,
        {
          backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
          borderColor: isDark ? Colors.dark.border : Colors.light.border,
        },
      ]}
    >
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  topBorder: {
    borderBottomWidth: 1,
  },
  bottomBorder: {
    borderTopWidth: 1,
  },
});

export default AdBanner;
