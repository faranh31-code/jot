import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  BackHandler,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadow, FontFamily } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trackEvent } from '../services/analytics';

type Plan = 'monthly' | 'annual' | 'lifetime';

interface PaywallModalProps {
  isVisible: boolean;
  isDark: boolean;
  trigger?: string;
  onClose: () => void;
}

const PRO_FEATURES = [
  { icon: 'infinite-outline' as const, text: 'Unlimited Notas' },
  { icon: 'ban-outline' as const, text: 'Ad-free experience' },
  { icon: 'share-social-outline' as const, text: 'Advanced sharing & export' },
  { icon: 'color-palette-outline' as const, text: 'Premium Note Card styles' },
  { icon: 'close-circle-outline' as const, text: 'Remove branding' },
  { icon: 'flash-outline' as const, text: 'Priority support' },
];

const PLAN_DETAILS: Record<
  Plan,
  { name: string; price: string; period: string; badge?: string; subtext: string; event: 'monthly_selected' | 'annual_selected' | 'lifetime_selected' }
> = {
  monthly: {
    name: 'Monthly',
    price: '$0.99',
    period: '/month',
    subtext: 'Billed monthly, cancel anytime',
    event: 'monthly_selected',
  },
  annual: {
    name: 'Annual',
    price: '$7.99',
    period: '/year',
    badge: 'BEST VALUE',
    subtext: "That's just $0.67/month — save 33%",
    event: 'annual_selected',
  },
  lifetime: {
    name: 'Lifetime',
    price: '$19.99',
    period: 'one-time',
    badge: 'PAY ONCE',
    subtext: 'Yours forever, no renewals',
    event: 'lifetime_selected',
  },
};

const PLAN_ORDER: Plan[] = ['monthly', 'annual', 'lifetime'];

const CTA_TEXT: Record<Plan, string> = {
  monthly: 'Start Nota Pro — Monthly',
  annual: 'Start Nota Pro — Annual',
  lifetime: 'Unlock Lifetime Access',
};

export default function PaywallModal({
  isVisible,
  isDark,
  trigger,
  onClose,
}: PaywallModalProps) {
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');
  const [busy, setBusy] = useState(false);
  const [viewH, setViewH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const slide = useRef(new Animated.Value(300)).current;

  const canScroll = contentH > viewH + 2;

  useEffect(() => {
    if (isVisible) {
      setViewH(0);
      setContentH(0);
      slide.setValue(300);
      Animated.timing(slide, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
      trackEvent({ event: 'paywall_viewed', params: { trigger: trigger || 'unknown' } });
    }
  }, [isVisible, trigger, slide]);

  useEffect(() => {
    if (!isVisible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [isVisible, onClose]);

  const selectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    trackEvent({ event: PLAN_DETAILS[plan].event });
  };

  const handlePurchase = async (plan: Plan) => {
    if (busy) return;
    setBusy(true);
    const planId: 'pro_monthly' | 'pro_annual' | 'pro_lifetime' =
      plan === 'monthly' ? 'pro_monthly' : plan === 'annual' ? 'pro_annual' : 'pro_lifetime';
    try {
      const { purchaseProMonthly, purchaseProAnnual, purchaseProLifetime } =
        await import('../services/subscription');
      const success =
        plan === 'monthly'
          ? await purchaseProMonthly()
          : plan === 'annual'
          ? await purchaseProAnnual()
          : await purchaseProLifetime();
      if (success) {
        trackEvent({ event: 'purchase_success', params: { plan: planId } });
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { restorePurchases } = await import('../services/subscription');
      const success = await restorePurchases();
      if (success) {
        onClose();
      } else {
        Alert.alert('No Purchases', 'No previous purchases found to restore.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: theme.bg, transform: [{ translateY: slide }] },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.border }]} />

        <View
          style={styles.scrollWrap}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0) setViewH(h);
          }}
        >
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: canScroll ? Spacing.md : 0 }]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={(_w, h) => setContentH(h)}
          >
            <View style={styles.heroSection}>
              <View style={[styles.iconBackground, { backgroundColor: Colors.accent }]}>
                <Ionicons name="diamond" size={22} color={Colors.onAccent} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                Unlock Nota Pro
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                All premium features, unlimited access.
              </Text>
            </View>

            <View style={styles.featuresSection}>
              {PRO_FEATURES.map((feature) => (
                <View key={feature.text} style={styles.featureRow}>
                  <View style={[styles.featureIconContainer, { backgroundColor: theme.accentLight }]}>
                    <Ionicons name={feature.icon} size={13} color={theme.accentText} />
                  </View>
                  <Text style={[styles.featureText, { color: theme.text }]} numberOfLines={2}>
                    {feature.text}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.plansSection}>
              {PLAN_ORDER.map((plan) => {
                const details = PLAN_DETAILS[plan];
                const isActive = selectedPlan === plan;
                return (
                  <TouchableOpacity
                    key={plan}
                    onPress={() => selectPlan(plan)}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isActive }}
                    style={[
                      styles.planRow,
                      {
                        backgroundColor: theme.surface,
                        borderColor: isActive ? theme.accentText : theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: isActive ? theme.accentText : theme.border },
                      ]}
                    >
                      {isActive && <View style={[styles.radioInner, { backgroundColor: theme.accentText }]} />}
                    </View>

                    <View style={styles.planInfo}>
                      <View style={styles.planNameRow}>
                        <Text style={[styles.planName, { color: theme.text }]}>{details.name}</Text>
                        {details.badge && (
                          <View style={[styles.planBadge, { backgroundColor: theme.accentLight }]}>
                            <Text style={[styles.planBadgeText, { color: theme.accentText }]}>
                              {details.badge}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.planSubtext, { color: theme.textSecondary }]} numberOfLines={1}>
                        {details.subtext}
                      </Text>
                    </View>

                    <View style={styles.planPriceBlock}>
                      <Text style={[styles.planPrice, { color: theme.text }]}>{details.price}</Text>
                      <Text style={[styles.planPeriod, { color: theme.textMuted }]}>{details.period}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {canScroll && (
            <View style={styles.scrollHint} pointerEvents="none">
              <Ionicons name="chevron-down" size={12} color={theme.textMuted} />
              <Text style={[styles.scrollHintText, { color: theme.textMuted }]}>Swipe for more</Text>
              <Ionicons name="chevron-down" size={12} color={theme.textMuted} />
            </View>
          )}
        </View>

        <View
          style={[
            styles.bottomSection,
            {
              borderTopColor: theme.border,
              backgroundColor: theme.bg,
              paddingBottom: Spacing.md + insets.bottom,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.ctaButton, busy && { opacity: 0.6 }]}
            onPress={() => handlePurchase(selectedPlan)}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaButtonText}>{busy ? 'Processing…' : CTA_TEXT[selectedPlan]}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRestore}
            disabled={busy}
            activeOpacity={0.7}
            style={styles.restoreButton}
          >
            <Text style={[styles.restoreText, { color: theme.textSecondary }]}>
              Restore Purchase
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.dismissButton}>
            <Text style={[styles.dismissText, { color: theme.textMuted }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 100,
    elevation: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    width: '100%',
    height: '92%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  scrollWrap: {
    flex: 1,
    marginTop: Spacing.xs,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
  },
  scrollHint: {
    position: 'absolute',
    bottom: Spacing.xs,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scrollHintText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  iconBackground: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.xl,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.sm,
  },
  featuresSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48.5%',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  featureIconContainer: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: '500',
    lineHeight: 15,
  },
  plansSection: {
    gap: Spacing.sm,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    gap: Spacing.sm,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
  },
  planInfo: {
    flex: 1,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 1,
  },
  planName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  planBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  planBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  planSubtext: {
    fontSize: FontSize.xs,
  },
  planPriceBlock: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  planPeriod: {
    fontSize: FontSize.xs,
  },
  bottomSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    ...Shadow.md,
  },
  ctaButtonText: {
    color: Colors.onAccent,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  restoreText: {
    fontSize: FontSize.sm,
    textDecorationLine: 'underline',
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  dismissText: {
    fontSize: FontSize.sm,
  },
});