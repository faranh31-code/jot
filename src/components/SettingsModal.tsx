import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  Share,
  Linking,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  BorderRadius,
  Spacing,
  FontSize,
  FontFamily,
} from "../constants/theme";
import { UserProfile } from "../services/firebase";
import { getSubscriptionStatus, onSubscriptionChange } from "../services/subscription";
import { storageGet } from "../services/storage";
import AdDiagnosticsOverlay from "../components/AdDiagnosticsOverlay";
import PaywallModal from "../components/PaywallModal";
import {
  buildReferralUrl,
  buildReferralMessage,
  ensureReferralProfile,
  getReferralSummary,
  REFERRALS_REQUIRED,
} from "../services/referral";
import { trackEvent } from "../services/analytics";
import StatsModal from "./StatsModal";
import EditProfileModal from "./EditProfileModal";
import AdBanner from "./AdBanner";

interface SettingsModalProps {
  isVisible: boolean;
  isDark: boolean;
  onClose: () => void;
  onOpenPaywall: (trigger?: string) => void;
  onOpenAuth: () => void;
  user: UserProfile | null;
  onSignOut: () => void;
  onDeleteAccount: (password?: string) => Promise<{ success: boolean; error?: string }>;
  onProfileUpdated?: () => void;
}

function SectionHeader({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <Text
      style={[
        styles.sectionHeader,
        { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted },
      ]}
    >
      {label}
    </Text>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  isDark,
  destructive,
  loading,
  showChevron = true,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value?: string;
  onPress?: () => void;
  isDark: boolean;
  destructive?: boolean;
  loading?: boolean;
  showChevron?: boolean;
}) {
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <Pressable
      style={[
        styles.row,
        { borderBottomColor: theme.border },
        !onPress && { opacity: 0.6 },
      ]}
      onPress={onPress}
      disabled={!onPress || loading}
    >
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Ionicons
            name={icon}
            size={18}
            color={destructive ? Colors.danger : theme.textSecondary}
          />
        </View>
        <Text
          style={[
            styles.rowLabel,
            {
              color: destructive ? Colors.danger : theme.text,
            },
          ]}
        >
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={destructive ? Colors.danger : theme.accentText}
          />
        ) : (
          <>
            {value && (
              <Text style={[styles.rowValue, { color: theme.textSecondary }]}>
                {value}
              </Text>
            )}
            {showChevron && onPress && (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.textMuted}
              />
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}

export default function SettingsModal({
  isVisible,
  isDark,
  onClose,
  onOpenAuth,
  user,
  onSignOut,
  onDeleteAccount,
  onProfileUpdated,
}: SettingsModalProps) {
  const theme = isDark ? Colors.dark : Colors.light;
  const [subStatus, setSubStatus] = useState(getSubscriptionStatus());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState<string | undefined>(undefined);
  const [adDiagVisible, setAdDiagVisible] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const openPaywall = useCallback((trigger?: string) => {
    setPaywallTrigger(trigger);
    setPaywallVisible(true);
  }, []);

  useEffect(() => {
    return onSubscriptionChange((status) => setSubStatus(status));
  }, []);
  const [referralCount, setReferralCount] = useState(0);
  const [referralRewarded, setReferralRewarded] = useState(false);
  const [grantActive, setGrantActive] = useState(false);
  const [referredBy, setReferredBy] = useState<string | null>(null);

  const refreshReferral = useCallback(async () => {
    if (!user?.uid) {
      setReferralCode(null);
      return;
    }
    const summary = await getReferralSummary(user.uid);
    await ensureReferralProfile(user.uid);
    setReferralCode(summary.code);
    setReferralCount(summary.referralCount);
    setReferralRewarded(summary.referralRewarded);
    setGrantActive(summary.grantActive);
    setReferredBy(summary.referredBy);
  }, [user?.uid]);

  useEffect(() => {
    if (isVisible) {
      refreshReferral();
    }
  }, [isVisible, refreshReferral]);

  const getProviderLabel = (provider: string): string => {
    if (provider.includes("google")) return "Google";
    if (provider.includes("apple")) return "Apple";
    if (provider.includes("password")) return "Email";
    if (provider.includes("anonymous")) return "Anonymous";
    return provider;
  };

  const getPlanLabel = (): string => {
    if (!subStatus.isPro) return "Free";
    if (subStatus.plan === "pro_lifetime") return "Pro (Lifetime)";
    if (subStatus.plan === "pro_annual") return "Pro (Annual)";
    if (subStatus.plan === "pro_referral") return "Pro (Referral)";
    return "Pro (Monthly)";
  };

  const handleShare = useCallback(async () => {
    try {
      const message =
        "Check out Nota - the simplest way to save and organize your notes!\n\nhttps://faran.app/nota";
      if (Platform.OS === "ios") {
        await Share.share({ url: "https://faran.app/nota", message });
      } else {
        await Share.share({ message });
      }
    } catch {}
  }, []);

  const handleRate = useCallback(() => {
    const url =
      Platform.OS === "ios"
        ? "https://faran.app/nota"
        : "market://details?id=com.faran.app3";
    Linking.openURL(url).catch(() => {});
  }, []);

  const handlePrivacyPolicy = useCallback(() => {
    Linking.openURL("https://faran.app/privacy").catch(() => {});
  }, []);

  const handleTerms = useCallback(() => {
    Linking.openURL("https://faran.app/terms").catch(() => {});
  }, []);

  const handleReferral = useCallback(async () => {
    try {
      const REFERRAL_CODE_KEY = "jotapp_referral_code";
      // Prefer the backend-issued code so the shared link resolves server-side.
      const codeToShare =
        referralCode ||
        (user?.uid ? user.uid.slice(0, 8).toUpperCase() : null) ||
        (await storageGet(REFERRAL_CODE_KEY)) ||
        `NOTA${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      if (user?.uid) {
        await ensureReferralProfile(user.uid);
        const summary = await getReferralSummary(user.uid);
        if (summary.code) {
          setReferralCode(summary.code);
        }
      }
      trackEvent({ event: "referral_link_created" });
      const message = buildReferralMessage(codeToShare);
      if (Platform.OS === "ios") {
        await Share.share({ url: buildReferralUrl(codeToShare), message });
      } else {
        await Share.share({ message });
      }
    } catch {}
  }, [user, referralCode]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your account and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleteLoading(true);
            const result = await onDeleteAccount();
            setDeleteLoading(false);
            if (!result.success && result.error) {
              Alert.alert("Error", result.error);
            }
          },
        },
      ]
    );
  }, [onDeleteAccount]);

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: onSignOut,
      },
    ]);
  }, [onSignOut]);

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View
          style={[
            styles.headerBar,
            { borderBottomColor: theme.border },
          ]}
        >
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close settings">
            <Ionicons name="close" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Settings
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {user ? (
            <>
              <SectionHeader label="ACCOUNT" isDark={isDark} />
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <SettingsRow
                  icon="person-outline"
                  label="Display Name"
                  value={user.displayName || "Not set"}
                  isDark={isDark}
                  onPress={() => setEditProfileVisible(true)}
                />
                <SettingsRow
                  icon="mail-outline"
                  label="Email"
                  value={user.email || "N/A"}
                  isDark={isDark}
                  showChevron={false}
                />
                <SettingsRow
                  icon="key-outline"
                  label="Sign-in Method"
                  value={getProviderLabel(user.provider)}
                  isDark={isDark}
                  showChevron={false}
                />
                {user.provider.includes("password") && (
                  <SettingsRow
                    icon="lock-closed-outline"
                    label="Change Password"
                    isDark={isDark}
                    onPress={() => setEditProfileVisible(true)}
                  />
                )}
              </View>
            </>
          ) : (
            <>
              <SectionHeader label="ACCOUNT" isDark={isDark} />
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Pressable style={styles.signInBanner} onPress={onOpenAuth}>
                  <Text
                    style={[
                      styles.signInBannerText,
                      { color: theme.text },
                    ]}
                  >
                    Sign in to sync your notas across devices
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.accentText}
                  />
                </Pressable>
              </View>
            </>
          )}

          <SectionHeader label="APPEARANCE" isDark={isDark} />
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <SettingsRow
              icon={isDark ? "moon-outline" : "sunny-outline"}
              label="Theme"
              value={isDark ? "Dark" : "Light"}
              isDark={isDark}
              showChevron={false}
            />
          </View>

          <SectionHeader label="SUBSCRIPTION" isDark={isDark} />
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <SettingsRow
              icon="diamond-outline"
              label="Current Plan"
              value={getPlanLabel()}
              isDark={isDark}
              showChevron={false}
            />
            {!subStatus.isPro && (
              <SettingsRow
                icon="star-outline"
                label="Upgrade to Pro"
                onPress={() => openPaywall("pro_feature")}
                isDark={isDark}
              />
            )}
            <SettingsRow
              icon="pulse-outline"
              label="Ad Diagnostics"
              value="BETA"
              isDark={isDark}
              onPress={() => setAdDiagVisible(true)}
            />
            <SettingsRow
              icon="eye-outline"
              label="Ad Inspector"
              value={Platform.OS === "ios" ? "iOS SDK only" : undefined}
              isDark={isDark}
              onPress={() => {
                if (Platform.OS === "ios") {
                  Alert.alert(
                    "Ad Inspector",
                    "On iOS this is opened from the SDK itself (GADMobileAds.presentAdInspectorFromViewController). Launch the app in Xcode and call it there, or use the diagnostics log instead."
                  );
                  return;
                }
                Linking.openURL("adInspector://com.faran.app3").catch((e) => {
                  const detail =
                    typeof e === "string" ? e : e instanceof Error ? e.message : JSON.stringify(e);
                  Alert.alert("Ad Inspector", `Could not open Ad Inspector (requires Google Play services with GMA SDK 24.4+).\n${detail}`);
                });
              }}
            />
          </View>

          <SectionHeader label="INSIGHTS" isDark={isDark} />
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <SettingsRow
              icon="stats-chart-outline"
              label="Your Stats"
              onPress={() => setStatsVisible(true)}
              isDark={isDark}
            />
          </View>

          <SectionHeader label="ABOUT" isDark={isDark} />
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <SettingsRow
              icon="cube-outline"
              label="Version"
              value="2.0.0"
              isDark={isDark}
              showChevron={false}
            />
            <SettingsRow
              icon="star-outline"
              label="Give Nota a Review"
              onPress={handleRate}
              isDark={isDark}
            />
            <SettingsRow
              icon="share-social-outline"
              label="Share Nota"
              onPress={handleShare}
              isDark={isDark}
            />
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              onPress={handlePrivacyPolicy}
              isDark={isDark}
            />
            <SettingsRow
              icon="document-text-outline"
              label="Terms of Use"
              onPress={handleTerms}
              isDark={isDark}
            />
          </View>

          <SectionHeader label="REFER & GET PRO" isDark={isDark} />
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Pressable
              style={styles.referralBanner}
              onPress={user?.email ? handleReferral : onOpenAuth}
            >
              <Text
                style={[styles.referralTitle, { color: theme.accentText }]}
              >
                Give Nota, Get Pro
              </Text>
              <Text
                style={[
                  styles.referralSubtitle,
                  { color: theme.textSecondary },
                ]}
              >
                {user?.email
                  ? `Refer ${REFERRALS_REQUIRED} friends, get 1 month of Pro free. Friends get a free Pro trial too.`
                  : "Sign in with email to share your referral link and earn free Pro."}
              </Text>
            </Pressable>

            {user?.email && (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.border },
                  ]}
                />

                <View style={styles.referralDetail}>
                  <View style={styles.progressRow}>
                    <Text style={[styles.progressText, { color: theme.text }]}>
                      {referralRewarded
                        ? "Reward unlocked!"
                        : `${referralCount} of ${REFERRALS_REQUIRED} friends`}
                    </Text>
                    {referralRewarded && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={theme.accentText}
                      />
                    )}
                  </View>
                  <View
                    style={[
                      styles.progressTrack,
                      { backgroundColor: theme.input, borderColor: theme.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: theme.accentText,
                          width: `${Math.min(100, (referralCount / REFERRALS_REQUIRED) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.referralStepText, { color: theme.textSecondary }]}>
                    {referralRewarded
                      ? "1 month of Nota Pro has been added to your account."
                      : grantActive
                      ? "Your Pro trial is active. Keep sharing to unlock the 1-month reward!"
                      : "Each friend unlocks a 7-day Pro trial when they sign up with your link."}
                  </Text>
                </View>
              </>
            )}

            <View
              style={[
                styles.divider,
                { backgroundColor: theme.border },
              ]}
            />

            <View style={styles.referralDetail}>
              <Text style={[styles.referralStep, { color: theme.accentText }]}>
                1. Share your link
              </Text>
              <Text style={[styles.referralStepText, { color: theme.textSecondary }]}>
                Tap the banner above to share your personal link on any app.
              </Text>

              <Text style={[styles.referralStep, { color: theme.accentText }]}>
                2. Friends sign up with email
              </Text>
              <Text style={[styles.referralStepText, { color: theme.textSecondary }]}>
                Each friend who installs Nota and creates an email account with your link counts as a referral.
              </Text>

              <Text style={[styles.referralStep, { color: theme.accentText }]}>
                3. Rewards are automatic
              </Text>
              <Text style={[styles.referralStepText, { color: theme.textSecondary }]}>
                Your friends get 7 days of Pro free on signup. Once {REFERRALS_REQUIRED} friends have signed up, 1 month of Pro is added to your account.
              </Text>
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: theme.border },
              ]}
            />

            <View style={styles.referralDetail}>
              <Text style={[styles.referralConditionsTitle, { color: theme.text }]}>
                Good to know
              </Text>
              <Text style={[styles.referralStepText, { color: theme.textSecondary }]}>
                {"\u2022"} Referral credits apply to new email signups only — anonymous, Google, and Apple accounts don't count.
              </Text>
              <Text style={[styles.referralStepText, { color: theme.textSecondary }]}>
                {"\u2022"} One reward per account — sending your link to yourself or bots doesn't count.
              </Text>
              <Text style={[styles.referralStepText, { color: theme.textSecondary }]}>
                {"\u2022"} Rewards are applied automatically when the signup is verified. No manual review needed.
              </Text>
            </View>
          </View>

          <SectionHeader label="ACCOUNT MANAGEMENT" isDark={isDark} />
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {user ? (
              <SettingsRow
                icon="log-out-outline"
                label="Sign Out"
                onPress={handleSignOut}
                isDark={isDark}
                destructive
                showChevron={false}
              />
            ) : (
              <SettingsRow
                icon="log-in-outline"
                label="Sign In"
                onPress={onOpenAuth}
                isDark={isDark}
                showChevron={false}
              />
            )}
            {user && (
              <SettingsRow
                icon="warning-outline"
                label="Delete Account"
                onPress={handleDelete}
                isDark={isDark}
                destructive
                loading={deleteLoading}
                showChevron={false}
              />
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
        {!subStatus.isPro && <AdBanner isDark={isDark} position="bottom" />}
      </View>

      <StatsModal
        isVisible={statsVisible}
        isDark={isDark}
        onClose={() => setStatsVisible(false)}
        isPro={subStatus.isPro}
      />
      <EditProfileModal
        isVisible={editProfileVisible}
        isDark={isDark}
        user={user}
        onClose={() => setEditProfileVisible(false)}
        onProfileUpdated={onProfileUpdated}
      />
      <PaywallModal
        isVisible={paywallVisible}
        isDark={isDark}
        trigger={paywallTrigger}
        onClose={() => setPaywallVisible(false)}
      />
      <AdDiagnosticsOverlay
        isDark={isDark}
        visible={adDiagVisible}
        onClose={() => setAdDiagVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.lg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.sm,
  },
  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    letterSpacing: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  card: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  rowIcon: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: FontSize.md,
    fontWeight: "500",
    flex: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  rowValue: {
    fontSize: FontSize.sm,
  },
  signInBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
  },
  signInBannerText: {
    fontSize: FontSize.md,
    fontWeight: "500",
    flex: 1,
  },
  referralBanner: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
  },
  referralTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    marginBottom: 4,
  },
  referralSubtitle: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  referralDetail: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  referralStep: {
    fontSize: FontSize.md,
    fontWeight: "700",
    marginTop: Spacing.xs,
  },
  referralStepText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  referralConditionsTitle: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  progressText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    minWidth: 8,
  },
});
