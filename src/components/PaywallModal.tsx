import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadow, FontFamily } from '../constants/theme';
import { trackEvent } from '../services/analytics';

type Plan = 'monthly' | 'annual' | 'lifetime';

interface PaywallModalProps {
  isVisible: boolean;
  isDark: boolean;
  trigger?: string;
  onClose: () => void;
  onPurchase: (plan: Plan) => void;
  onRestore: () => void;
}

const PRO_FEATURES = [
  { icon: 'infinite-outline' as const, text: 'Unlimited Jots' },
  { icon: 'ban-outline' as const, text: 'Ad-free experience' },
  { icon: 'share-social-outline' as const, text: 'Advanced sharing & export' },
  { icon: 'color-palette-outline' as const, text: 'Premium Jot Card styles' },
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
  monthly: 'Start Jot Pro — Monthly',
  annual: 'Start Jot Pro — Annual',
  lifetime: 'Unlock Lifetime Access',
};

export default function PaywallModal({
  isVisible,
  isDark,
  trigger,
  onClose,
  onPurchase,
  onRestore,
}: PaywallModalProps) {
  const theme = isDark ? Colors.dark : Colors.light;
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');

  useEffect(() => {
    if (isVisible) {
      trackEvent({ event: 'paywall_viewed', params: { trigger: trigger || 'unknown' } });
    }
  }, [isVisible, trigger]);

  const selectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    trackEvent({ event: PLAN_DETAILS[plan].event });
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: theme.input }]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Ionicons name="diamond" size={40} color={Colors.onAccent} />
              </View>
            </View>

            <Text style={[styles.title, { color: theme.text }]}>
              Unlock Jot Pro
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Get the full Jot experience with unlimited access to all premium features.
            </Text>
          </View>

          <View style={styles.featuresSection}>
            {PRO_FEATURES.map((feature) => (
              <View key={feature.text} style={styles.featureRow}>
                <View style={[styles.featureIconContainer, { backgroundColor: theme.accentLight }]}>
                  <Ionicons
                    name={feature.icon}
                    size={20}
                    color={theme.accentText}
                  />
                </View>
                <Text style={[styles.featureText, { color: theme.text }]}>
                  {feature.text}
                </Text>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={Colors.success}
                />
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
                    <Text style={[styles.planSubtext, { color: theme.textSecondary }]}>
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

        <View style={[styles.bottomSection, { borderTopColor: theme.border, backgroundColor: theme.bg }]}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => onPurchase(selectedPlan)}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaButtonText}>{CTA_TEXT[selectedPlan]}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onRestore}
            activeOpacity={0.7}
            style={styles.restoreButton}
          >
            <Text style={[styles.restoreText, { color: theme.textSecondary }]}>
              Restore Purchase
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={styles.dismissButton}
          >
            <Text style={[styles.dismissText, { color: theme.textMuted }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginRight: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xxl,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.hero,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  featuresSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  plansSection: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    gap: Spacing.md,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
  },
  planInfo: {
    flex: 1,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  planName: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  planBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  planBadgeText: {
    fontSize: FontSize.xs,
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
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  planPeriod: {
    fontSize: FontSize.xs,
  },
  bottomSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  ctaButtonText: {
    color: Colors.onAccent,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  restoreText: {
    fontSize: FontSize.sm,
    textDecorationLine: 'underline',
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  dismissText: {
    fontSize: FontSize.sm,
  },
});
