import { getBannerAdUnitId } from "../constants/admob";
import React, { useEffect, useState, useCallback } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { onAdsReady, isAdsInitialized, adDiag, formatAdError } from "../services/ads";
import { Colors } from "../constants/theme";
import { trackEvent } from "../services/analytics";

const isExpoGo = (globalThis as any).expo?.modules?.ExponentConstants?.appOwnership === "expo";

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
  const [retryKey, setRetryKey] = useState(0);

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

  useEffect(() => {
    if (!adError) return;
    const timer = setTimeout(() => {
      console.log(`AdBanner (${position}): Retrying ad load`);
      setAdError(null);
      setRetryKey((k) => k + 1);
    }, 15000);
    return () => clearTimeout(timer);
  }, [adError, retryKey, position]);

  const handleAdLoaded = useCallback(() => {
    console.log(`AdBanner (${position}): Ad loaded successfully`);
    adDiag("info", `Banner(${position}) loaded`);
    setAdError(null);
    setAdLoaded(true);
    trackEvent({ event: "banner_ad_loaded" });
  }, [position]);

  const handleAdFailedToLoad = useCallback((error: any) => {
    const detail = formatAdError(error);
    console.log(`AdBanner (${position}): Ad failed to load -`, error, "detail=", detail);
    adDiag("error", `Banner(${position}) failed: ${detail}`);
    setAdError(detail || "Unknown error");
    setAdLoaded(false);
  }, [position]);

  if (Platform.OS === "web" || isExpoGo || !BannerAd || !BannerAdSize) {
    return null;
  }

  if (!sdkReady) {
    return null;
  }

  const unitId = getBannerAdUnitId();

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
        key={retryKey}
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
