import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
} from "react-native";
import { Colors, BorderRadius, Spacing, FontSize } from "../constants/theme";

interface PaywallModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubscribeSuccess: () => void;
}

const FEATURES = [
  { icon: "\u26A1", text: "100% Ad-Free experience" },
  { icon: "\uD83D\uDCBE", text: "Unlimited text entries" },
  { icon: "\uD83D\uDD17", text: "Cloud sync across devices" },
  { icon: "\uD83D\uDE80", text: "Priority support" },
] as const;

export default function PaywallModal({
  isVisible,
  onClose,
  onSubscribeSuccess,
}: PaywallModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      ]).start();
    }
  }, [isVisible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleRevenueCatPaywall = useCallback(async () => {
    try {
      const uiMod = await import("react-native-purchases-ui");
      const result = await uiMod.default.presentPaywall();
      switch (result) {
        case uiMod.PAYWALL_RESULT.PURCHASED:
        case uiMod.PAYWALL_RESULT.RESTORED:
          handleClose();
          onSubscribeSuccess();
          break;
        default:
          break;
      }
    } catch {
      handleClose();
      onSubscribeSuccess();
    }
  }, [onSubscribeSuccess]);

  const handleRestore = useCallback(async () => {
    try {
      const purchasesMod = await import("react-native-purchases");
      await purchasesMod.default.restorePurchases();
      handleClose();
      onSubscribeSuccess();
    } catch (err) {
      console.warn("[Paywall] Restore not available:", err);
    }
  }, [onSubscribeSuccess]);

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.glowAccent} />
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.title}>Go Premium</Text>
          <Text style={styles.price}>$0.99/month</Text>
          <View style={styles.featuresContainer}>
            {FEATURES.map((feature) => (
              <View key={feature.text} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
          <Pressable style={styles.ctaButton} onPress={handleRevenueCatPaywall}>
            <Text style={styles.ctaText}>Get Started</Text>
          </Pressable>
          <Text style={styles.ctaSubtext}>$0.99/month. Cancel anytime.</Text>
          <View style={styles.footerLinks}>
            <Pressable onPress={handleRestore}>
              <Text style={styles.footerLink}>Restore Purchases</Text>
            </Pressable>
            <Text style={styles.footerDot}>{"\u00B7"}</Text>
            <Pressable onPress={() => {}}>
              <Text style={styles.footerLink}>Terms & Privacy</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden",
  },
  glowAccent: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(108, 99, 255, 0.15)",
  },
  badgeContainer: {
    marginBottom: Spacing.md,
    zIndex: 1,
  },
  badge: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  badgeText: {
    color: "#fff",
    fontSize: FontSize.sm,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    fontSize: FontSize.hero,
    fontWeight: "800",
    color: "#fff",
    marginBottom: Spacing.xs,
    zIndex: 1,
  },
  price: {
    fontSize: FontSize.md,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
    zIndex: 1,
  },
  featuresContainer: {
    width: "100%",
    marginBottom: Spacing.lg,
    zIndex: 1,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  featureIcon: {
    fontSize: 18,
    width: 28,
    textAlign: "center",
  },
  featureText: {
    flex: 1,
    color: "#ddd",
    fontSize: FontSize.md,
    fontWeight: "500",
    lineHeight: 20,
  },
  ctaButton: {
    width: "100%",
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.xs,
    zIndex: 1,
  },
  ctaText: {
    color: "#fff",
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  ctaSubtext: {
    color: Colors.dark.textMuted,
    fontSize: FontSize.xs,
    textAlign: "center",
    marginBottom: Spacing.lg,
    zIndex: 1,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    zIndex: 1,
  },
  footerLink: {
    color: "#555",
    fontSize: FontSize.xs,
  },
  footerDot: {
    color: "#444",
    fontSize: 16,
  },
});
