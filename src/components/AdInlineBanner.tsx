import { getBannerAdUnitId } from "../constants/admob";
import React, { useEffect, useState, useCallback } from "react";
import { Platform, StyleSheet, View, Text } from "react-native";
import { onAdsReady, isAdsInitialized, isAdsModuleAvailable, adDiag, formatAdError } from "../services/ads";
import { Colors, BorderRadius } from "../constants/theme";
import { trackEvent } from "../services/analytics";

const isExpoGo = (globalThis as any).expo?.modules?.ExponentConstants?.appOwnership === "expo";

let BannerAd: any = null;
let BannerAdSize: any = null;
let GAMBannerAdSize: any = null;

if (Platform.OS !== "web" && !isExpoGo) {
  try {
    const adsModule = require("react-native-google-mobile-ads");
    BannerAd = adsModule.BannerAd;
    BannerAdSize = adsModule.BannerAdSize;
    GAMBannerAdSize = adsModule.GAMBannerAdSize;
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
  const [adFailed, setAdFailed] = useState(false);
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
    if (!adFailed) return;
    const timer = setTimeout(() => {
      setAdFailed(false);
      setRetryKey((k) => k + 1);
    }, 15000);
    return () => clearTimeout(timer);
  }, [adFailed, retryKey]);

  const handleAdLoaded = useCallback(() => {
    console.log("AdInlineBanner: Ad loaded");
    adDiag("info", "Inline banner loaded");
    setAdLoaded(true);
    setAdFailed(false);
    trackEvent({ event: "banner_ad_loaded" });
  }, []);

  const handleAdFailedToLoad = useCallback((error: any) => {
    const detail = formatAdError(error);
    console.log("AdInlineBanner: Ad failed -", error, "detail=", detail);
    adDiag("error", `Inline banner failed: ${detail}`);
    setAdLoaded(false);
    setAdFailed(true);
  }, []);

  if (Platform.OS === "web" || isExpoGo || !BannerAd || !BannerAdSize || !sdkReady) {
    if (Platform.OS === "web" || isExpoGo) return null;
    return null;
  }

  const inlineSize = GAMBannerAdSize?.FLUID ?? BannerAdSize.ANCHORED_ADAPTIVE_BANNER;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
          borderTopColor: isDark ? Colors.dark.border : Colors.light.border,
          borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
          minHeight: 50,
        },
      ]}
    >
      {!isAdsModuleAvailable() ? (
        <Text style={{ color: isDark ? Colors.dark.textMuted : Colors.light.textMuted, fontSize: 12 }}>
          Loading ad...
        </Text>
      ) : null}
      <BannerAd
        key={retryKey}
        unitId={getBannerAdUnitId()}
        size={inlineSize}
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