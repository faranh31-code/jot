import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { getNativeAdUnitId } from "../constants/admob";
import { onAdsReady, isAdsInitialized, adDiag, formatAdError } from "../services/ads";
import { Colors, BorderRadius, Spacing } from "../constants/theme";
import { trackEvent } from "../services/analytics";

const isExpoGo = (globalThis as any).expo?.modules?.ExponentConstants?.appOwnership === "expo";

let NativeAd: any = null;
let NativeAdView: any = null;
let NativeMediaView: any = null;

if (Platform.OS !== "web" && !isExpoGo) {
  try {
    const adsModule = require("react-native-google-mobile-ads");
    NativeAd = adsModule.NativeAd;
    NativeAdView = adsModule.NativeAdView;
    NativeMediaView = adsModule.NativeMediaView;
  } catch (error) {
    console.log("AdNative: Native ad components not available");
  }
}

interface AdNativeProps {
  isDark?: boolean;
}

const AdNative: React.FC<AdNativeProps> = ({ isDark }) => {
  const [sdkReady, setSdkReady] = useState(isAdsInitialized());
  const [ad, setAd] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const adRef = useRef<any>(null);

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

  const load = useCallback(async () => {
    if (!NativeAd || !isAdsInitialized()) return;
    if (adRef.current) {
      try {
        adRef.current.destroy();
      } catch (error) {
        console.log("AdNative: Error destroying previous ad:", error);
      }
      adRef.current = null;
    }
    setAd(null);
    try {
      const unitId = getNativeAdUnitId();
      console.log("AdNative: Loading native ad:", unitId);
      adDiag("info", "Loading native ad");
      const nativeAd = await NativeAd.createForAdRequest(unitId, {
        aspectRatio: 2,
        adChoicesPlacement: 1,
        startVideoMuted: true,
      });
      adRef.current = nativeAd;
      setAd(nativeAd);
      setFailed(false);
      adDiag("info", "Native ad loaded");
      trackEvent({ event: "native_ad_loaded" });
    } catch (error: any) {
      const detail = formatAdError(error);
      console.log("AdNative: Native ad failed -", error, "detail=", detail);
      adDiag("error", `Native ad failed: ${detail}`);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (sdkReady) load();
  }, [sdkReady, retryKey, load]);

  useEffect(() => {
    if (!failed) return;
    const timer = setTimeout(() => {
      setRetryKey((k) => k + 1);
    }, 15000);
    return () => clearTimeout(timer);
  }, [failed, retryKey]);

  useEffect(
    () => () => {
      if (adRef.current) {
        try {
          adRef.current.destroy();
        } catch (error) {
          console.log("AdNative: Error destroying ad on unmount:", error);
        }
      }
    },
    []
  );

  if (Platform.OS === "web" || isExpoGo || !NativeAd || !NativeAdView || !sdkReady || !ad) {
    return null;
  }

  const hasMedia =
    !!(ad.mediaContent && ad.mediaContent.aspectRatio > 0) ||
    !!(ad.images && ad.images.length > 0);

  return (
    <View style={styles.wrapper}>
      <NativeAdView nativeAd={ad}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
              borderColor: isDark ? Colors.dark.border : Colors.light.border,
            },
          ]}
        >
          <View style={styles.headerRow}>
            {ad.icon ? (
              <Image source={{ uri: ad.icon.url }} style={styles.icon} />
            ) : (
              <View
                style={[
                  styles.icon,
                  styles.iconPlaceholder,
                  { backgroundColor: isDark ? Colors.dark.card : Colors.light.card },
                ]}
              >
                <Text style={[styles.iconPlaceholderText, { color: Colors.accent }]}>Ad</Text>
              </View>
            )}
            <View style={styles.headerText}>
              <Text
                style={[styles.headline, { color: isDark ? Colors.dark.text : Colors.light.text }]}
                numberOfLines={1}
              >
                {ad.headline}
              </Text>
              {ad.advertiser ? (
                <Text
                  style={[
                    styles.advertiser,
                    { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {ad.advertiser}
                </Text>
              ) : null}
            </View>
          </View>

          {ad.body ? (
            <Text
              style={[styles.body, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}
              numberOfLines={2}
            >
              {ad.body}
            </Text>
          ) : null}

          {hasMedia ? <NativeMediaView style={styles.media} resizeMode="cover" /> : null}

          <View style={styles.footerRow}>
            <Text
              style={[styles.sponsored, { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }]}
            >
              Sponsored
            </Text>
            {ad.callToAction ? (
              <View style={styles.cta}>
                <Text style={styles.ctaText}>{ad.callToAction}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </NativeAdView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
  },
  iconPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconPlaceholderText: {
    fontSize: 13,
    fontWeight: "700",
  },
  headerText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headline: {
    fontSize: 15,
    fontWeight: "700",
  },
  advertiser: {
    fontSize: 12,
    marginTop: 2,
  },
  body: {
    fontSize: 13,
    marginTop: Spacing.sm,
  },
  media: {
    width: "100%",
    height: 160,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    backgroundColor: "transparent",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  sponsored: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cta: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.accent,
  },
  ctaText: {
    color: Colors.onAccent,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});

export default AdNative;