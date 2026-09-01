import React, { useState, useCallback } from "react";
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
import { UserProfile, updateDisplayName } from "../services/firebase";
import { getSubscriptionStatus } from "../services/subscription";
import StatsModal from "./StatsModal";

interface SettingsModalProps {
  isVisible: boolean;
  isDark: boolean;
  onClose: () => void;
  onOpenPaywall: (trigger?: string) => void;
  onOpenAuth: () => void;
  user: UserProfile | null;
  onSignOut: () => void;
  onDeleteAccount: (password?: string) => Promise<{ success: boolean; error?: string }>;
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
  onOpenPaywall,
  onOpenAuth,
  user,
  onSignOut,
  onDeleteAccount,
}: SettingsModalProps) {
  const theme = isDark ? Colors.dark : Colors.light;
  const subStatus = getSubscriptionStatus();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);

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
    return "Pro (Monthly)";
  };

  const handleShare = useCallback(async () => {
    try {
      const message =
        "Check out Jot - the simplest way to save and organize your notes!\n\nhttps://apps.apple.com/app/jot";
      if (Platform.OS === "ios") {
        await Share.share({ url: "https://apps.apple.com/app/jot", message });
      } else {
        await Share.share({ message });
      }
    } catch {}
  }, []);

  const handleRate = useCallback(() => {
    const url =
      Platform.OS === "ios"
        ? "https://apps.apple.com/app/jot"
        : "market://details?id=com.faran.app3";
    Linking.openURL(url).catch(() => {});
  }, []);

  const handlePrivacyPolicy = useCallback(() => {
    Linking.openURL("https://faran.app/privacy").catch(() => {});
  }, []);

  const handleTerms = useCallback(() => {
    Linking.openURL("https://faran.app/terms").catch(() => {});
  }, []);

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
          <Pressable onPress={onClose} style={styles.closeBtn}>
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
                  showChevron={false}
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
                    Sign in to sync your jots across devices
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
                onPress={() => onOpenPaywall("pro_feature")}
                isDark={isDark}
              />
            )}
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
              label="Give Jot a Review"
              onPress={handleRate}
              isDark={isDark}
            />
            <SettingsRow
              icon="share-social-outline"
              label="Share Jot"
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

          <SectionHeader label="REFERRAL" isDark={isDark} />
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
              onPress={() => {
                Share.share({
                  message:
                    "Join me on Jot! Save anything, find everything.\n\nhttps://jot.app/ref",
                });
              }}
            >
              <Text
                style={[styles.referralTitle, { color: theme.accentText }]}
              >
                Give Jot, Get Pro
              </Text>
              <Text
                style={[
                  styles.referralSubtitle,
                  { color: theme.textSecondary },
                ]}
              >
                Share your referral link. When a friend signs up, you both
                get rewards.
              </Text>
            </Pressable>
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
      </View>

      <StatsModal
        isVisible={statsVisible}
        isDark={isDark}
        onClose={() => setStatsVisible(false)}
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
    width: 40,
    height: 40,
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
});
