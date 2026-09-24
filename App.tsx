import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  AppState,
  Alert,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { useShareIntent } from "./src/hooks/useShareIntentSafe";
import * as SplashScreen from "expo-splash-screen";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "./src/screens/HomeScreen";
import AuthModal from "./src/components/AuthModal";
import SettingsModal from "./src/components/SettingsModal";
import PaywallModal from "./src/components/PaywallModal";
import AdBanner from "./src/components/AdBanner";
import AdDiagnosticsOverlay from "./src/components/AdDiagnosticsOverlay";
import { useAppSettings } from "./src/hooks/useAppSettings";
import { useReviewPrompt } from "./src/hooks/useReviewPrompt";
import { useAppFonts } from "./src/hooks/useAppFonts";
import {
  initFirebase,
  onAuthStateChanged,
  signOut,
  deleteAccount,
  getCurrentUser,
  UserProfile,
} from "./src/services/firebase";
import {
  initializeMobileAds,
  loadAppOpenAd,
  showAppOpenAd,
  loadInterstitial,
  onAdsReady,
} from "./src/services/ads";
import { initSubscription, isPro } from "./src/services/subscription";
import {
  captureReferralCode,
  ensureReferralProfile,
  submitReferralClaim,
  applyReferralGrant,
} from "./src/services/referral";
import { startSession, endSession, trackEvent, getRetentionStats, trackFirstOpen } from "./src/services/analytics";
import { Colors, BorderRadius, Spacing, FontSize, FontFamily } from "./src/constants/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const fontsLoaded = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  const {
    isDark,
    isLoaded: settingsLoaded,
    toggleTheme,
  } = useAppSettings();

  const {
    isModalVisible: isReviewVisible,
    handleUserReviewed,
    handleUserDismissed,
  } = useReviewPrompt();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState<string | undefined>(undefined);

  const appState = useRef(AppState.currentState);

  // --- Firebase + Services Init ---
  useEffect(() => {
    (async () => {
      const ready = await initFirebase();
      setFirebaseReady(ready);
      if (ready) {
        await initSubscription();
      }
      initializeMobileAds();
      trackFirstOpen();
      startSession();
      const retention = await getRetentionStats();
      if (retention.daysSinceInstall >= 1) {
        trackEvent({ event: "return_session", params: { daysSinceInstall: retention.daysSinceInstall } });
      }

      onAdsReady(() => {
        loadAppOpenAd();
        loadInterstitial();
      });
      setTimeout(() => {
        loadAppOpenAd();
        loadInterstitial();
      }, 8000);
    })();
  }, []);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  const coldStartAdShown = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isPro() && !coldStartAdShown.current) {
        coldStartAdShown.current = true;
        showAppOpenAd();
      }
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  // --- Auth State ---
  useEffect(() => {
    if (!firebaseReady) return;
    const unsubscribe = onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsAnonymous(!!user && !!getCurrentUser()?.provider?.includes("anonymous"));
    });
    return unsubscribe;
  }, [firebaseReady]);

  // --- Deep Linking (share-into-Jot) ---
  const [sharedText, setSharedText] = useState<string | null>(null);

  // --- Native Share-to-Jot (OS share sheet from other apps) ---
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (hasShareIntent && shareIntent?.text) {
      setSharedText(shareIntent.text);
      trackEvent({ event: "share_started", params: { type: "share_extension" } });
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent]);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      // Any incoming URL with an invite code (/r/CODE or ?code=) is captured so
      // a brand-new email signup can later submit a referral claim.
      captureReferralCode(url);
      const parsed = Linking.parse(url);
      if (parsed.scheme === "jotapp") {
        const text = parsed.queryParams?.text as string | undefined;
        if (text) {
          setSharedText(text);
          trackEvent({ event: "share_started", params: { type: "deep_link" } });
        }
        if (parsed.hostname === "share") {
          const sharedContent = parsed.queryParams?.text as string | undefined;
          if (sharedContent) {
            setSharedText(sharedContent);
            trackEvent({ event: "share_started", params: { type: "share_extension" } });
          }
        }
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener("url", (event) =>
      handleUrl(event.url)
    );
    return () => sub.remove();
  }, []);

  // --- Referral: submit a pending claim after an email signup; apply Pro grant --
  useEffect(() => {
    if (!firebaseReady || !currentUser) return;
    if (currentUser.provider.includes("anonymous")) return;

    (async () => {
      await ensureReferralProfile(currentUser.uid);
      await submitReferralClaim(currentUser);
      await applyReferralGrant(currentUser.uid);
    })();
  }, [firebaseReady, currentUser?.uid, currentUser?.provider]);

  // --- App Foreground ---
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appState.current.match(/background/) && nextState === "active") {
        if (!isPro()) {
          showAppOpenAd();
        }
        trackEvent({ event: "active_user" });
        if (!isPro()) {
          loadInterstitial();
        }
        // Refresh a referral-granted Pro (friend trial or referral reward).
        applyReferralGrant(currentUser?.uid || "").catch(() => {});
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [currentUser?.uid]);

  // --- Handlers ---
  const handleRequireAuth = useCallback(() => setAuthVisible(true), []);
  const handleOpenSettings = useCallback(() => setSettingsVisible(true), []);
  const handleOpenPaywall = useCallback((trigger?: string) => {
    setPaywallTrigger(trigger);
    setPaywallVisible(true);
  }, []);
  const handleAuthSuccess = useCallback(() => setAuthVisible(false), []);

  // updateProfile()/updatePassword() don't re-trigger onAuthStateChanged, so
  // refresh currentUser from getCurrentUser() after an Edit Profile save.
  const handleProfileUpdated = useCallback(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          const { logoutRevenueCat } = await import("./src/services/subscription");
          await logoutRevenueCat();
          await signOut();
          setSettingsVisible(false);
        },
      },
    ]);
  }, []);

  const handleDeleteAccount = useCallback(
    async (password?: string) => {
      const result = await deleteAccount(password);
      if (result.success) {
        setSettingsVisible(false);
        Alert.alert(
          "Account Deleted",
          "Your account and data have been permanently deleted."
        );
      }
      return result;
    },
    []
  );

  const handlePurchaseClose = useCallback(() => {
    setPaywallVisible(false);
  }, []);

  // --- Derived ---
  const showAds = !isPro();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? Colors.dark.bg : Colors.light.bg}
      />

      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg },
        ]}
        edges={["top"]}
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: isDark
                ? Colors.dark.border
                : Colors.light.border,
            },
          ]}
        >
          <View style={styles.headerTitleWrap}>
            <Text
              style={[
                styles.headerTitle,
                { color: isDark ? Colors.dark.text : Colors.light.text },
              ]}
            >
              Nota
            </Text>
            {currentUser?.displayName ? (
              <Text
                style={[
                  styles.headerGreeting,
                  { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary },
                ]}
                numberOfLines={1}
              >
                Hi, {currentUser.displayName}
              </Text>
            ) : null}
          </View>
          <View style={styles.headerButtons}>
            <Pressable
              style={[
                styles.headerBtn,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.05)",
                },
              ]}
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel={isDark ? "Switch to light theme" : "Switch to dark theme"}
            >
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={19}
                color={isDark ? Colors.dark.text : Colors.light.text}
              />
            </Pressable>
            <Pressable
              style={[
                styles.headerBtn,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.05)",
                },
              ]}
              onPress={handleOpenSettings}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Ionicons
                name="settings-outline"
                size={19}
                color={isDark ? Colors.dark.text : Colors.light.text}
              />
            </Pressable>
          </View>
        </View>

        {showAds && <AdBanner isDark={isDark} position="top" />}

        <HomeScreen
          isDark={isDark}
          uid={currentUser?.uid || null}
          isAnonymous={isAnonymous}
          onRequireAuth={handleRequireAuth}
          onOpenPaywall={handleOpenPaywall}
          sharedText={sharedText}
          onSharedTextConsumed={() => setSharedText(null)}
        />

        {showAds && <AdBanner isDark={isDark} position="bottom" />}
      </SafeAreaView>

      <AuthModal
        isVisible={authVisible}
        isDark={isDark}
        onClose={() => setAuthVisible(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <SettingsModal
        isVisible={settingsVisible}
        isDark={isDark}
        onClose={() => setSettingsVisible(false)}
        onOpenPaywall={handleOpenPaywall}
        onOpenAuth={handleRequireAuth}
        user={currentUser}
        onSignOut={handleSignOut}
        onDeleteAccount={handleDeleteAccount}
        onProfileUpdated={handleProfileUpdated}
      />

      <PaywallModal
        isVisible={paywallVisible}
        isDark={isDark}
        trigger={paywallTrigger}
        onClose={handlePurchaseClose}
      />

      {isReviewVisible && (
        <View style={styles.reviewOverlay}>
          <Pressable
            style={styles.reviewBackdrop}
            onPress={handleUserDismissed}
          />
          <View
            style={[
              styles.reviewCard,
              {
                backgroundColor: isDark
                  ? Colors.dark.card
                  : Colors.light.card,
                borderColor: isDark
                  ? Colors.dark.border
                  : Colors.light.border,
              },
            ]}
          >
            <View
              style={[
                styles.reviewIconWrap,
                { backgroundColor: isDark ? Colors.dark.accentLight : Colors.light.accentLight },
              ]}
            >
              <Ionicons
                name="heart-outline"
                size={26}
                color={isDark ? Colors.dark.accentText : Colors.light.accentText}
              />
            </View>
            <Text
              style={[
                styles.reviewTitle,
                {
                  color: isDark ? Colors.dark.text : Colors.light.text,
                },
              ]}
            >
              Enjoying Jot?
            </Text>
            <Text
              style={[
                styles.reviewSubtitle,
                {
                  color: isDark
                    ? Colors.dark.textSecondary
                    : Colors.light.textSecondary,
                },
              ]}
            >
              Your review helps us improve and grow!
            </Text>
            <View style={styles.reviewActions}>
              <Pressable
                style={styles.reviewPrimaryBtn}
                onPress={handleUserReviewed}
              >
                <Text style={styles.reviewPrimaryBtnText}>Rate App</Text>
              </Pressable>
              <Pressable
                style={styles.reviewSecondaryBtn}
                onPress={handleUserDismissed}
              >
                <Text
                  style={[
                    styles.reviewSecondaryBtnText,
                    {
                      color: isDark
                        ? Colors.dark.textSecondary
                        : Colors.light.textSecondary,
                    },
                  ]}
                >
                  Maybe Later
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
      <AdDiagnosticsOverlay isDark={isDark} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.xl,
  },
  headerTitleWrap: {
    flexShrink: 1,
  },
  headerGreeting: {
    fontSize: FontSize.sm,
    marginTop: 1,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 9999,
  },
  reviewBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  reviewCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius.xl,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
  },
  reviewIconWrap: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  reviewTitle: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.xl,
    textAlign: "center",
    marginBottom: 8,
  },
  reviewSubtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  reviewActions: {
    width: "100%",
    gap: 12,
  },
  reviewPrimaryBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  reviewPrimaryBtnText: {
    color: Colors.onAccent,
    fontSize: FontSize.md,
    fontWeight: "700",
  },
  reviewSecondaryBtn: {
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  reviewSecondaryBtnText: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
});
