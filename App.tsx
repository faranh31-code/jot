import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, StatusBar, Modal, Alert } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import HomeScreen from "./src/screens/HomeScreen";
import PaywallModal from "./src/components/PaywallModal";
import AuthModal from "./src/components/AuthModal";
import AppGuideModal from "./src/components/AppGuideModal";
import AdBanner from "./src/components/AdBanner";
import { useSubscription } from "./src/hooks/useSubscription";
import { useReviewPrompt } from "./src/hooks/useReviewPrompt";
import { initFirebase, onAuthStateChanged, signOut, UserProfile } from "./src/services/firebase";
import { Colors } from "./src/constants/theme";

export default function App() {
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [proStatusVisible, setProStatusVisible] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const { isPro } = useSubscription();
  const { isModalVisible: isReviewVisible, handleUserReviewed, handleUserDismissed } = useReviewPrompt();

  useEffect(() => {
    (async () => {
      const ready = await initFirebase();
      setFirebaseReady(ready);
    })();
  }, []);

  useEffect(() => {
    if (!firebaseReady) return;
    const unsubscribe = onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, [firebaseReady]);

  const uiBg = isDark ? Colors.dark.bg : Colors.light.bg;
  const uiBorder = isDark ? Colors.dark.border : Colors.light.border;
  const uiCard = isDark ? Colors.dark.card : Colors.light.card;
  const uiText = isDark ? Colors.dark.text : Colors.light.text;

  const handleRequireAuth = useCallback(() => {
    setAuthVisible(true);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setAuthVisible(false);
  }, []);

  const handleProTab = useCallback(() => {
    if (isPro) {
      setProStatusVisible(true);
    } else {
      setPaywallVisible(true);
    }
  }, [isPro]);

  const handleSignOut = useCallback(() => {
    Alert.alert("Log Out", "Do you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          setProStatusVisible(false);
        },
      },
    ]);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  const userGreeting = currentUser?.displayName
    ? `Hello, ${currentUser.displayName}`
    : currentUser?.email
    ? `Hello, ${currentUser.email.split("@")[0]}`
    : "Jot";

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={uiBg} />

      <SafeAreaView style={[styles.container, { backgroundColor: uiBg }]} edges={["top"]}>
        <AdBanner isPro={isPro} isDark={isDark} />

        <View style={[styles.header, { borderBottomColor: uiBorder }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerGreeting, { color: uiText }]} numberOfLines={1}>
              {currentUser ? userGreeting : "Jot"}
            </Text>
            <Text style={[styles.headerSubtitle, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
              {currentUser
                ? `${currentUser.email || ""}`
                : "Sign in to sync your entries"}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable style={[styles.headerBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} onPress={toggleTheme}>
              <Text style={styles.headerBtnIcon}>{isDark ? "\u2600\uFE0F" : "\uD83C\uDF19"}</Text>
            </Pressable>
            {currentUser && (
              <Pressable style={[styles.headerBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} onPress={handleSignOut}>
                <Text style={styles.headerBtnIcon}>{"\uD83D\uDEAA"}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <HomeScreen
          isDark={isDark}
          isUserLoggedIn={!!currentUser}
          onRequireAuth={handleRequireAuth}
        />

        <View style={[styles.tabBar, { backgroundColor: uiBg, borderTopColor: uiBorder }]}>
          <Pressable
            style={[styles.tab, { backgroundColor: "rgba(108,99,255,0.15)" }]}
          >
            <Text style={[styles.tabIcon, styles.tabIconActive]}>{"\uD83D\uDCCB"}</Text>
            <Text style={[styles.tabLabel, styles.tabLabelActive]}>Entries</Text>
          </Pressable>

          <Pressable style={styles.tab} onPress={handleProTab}>
            <Text style={[styles.tabIcon, isPro && styles.tabIconActive]}>{"\u2B50"}</Text>
            <Text style={[styles.tabLabel, isPro && styles.tabLabelActive]}>
              {isPro ? "Pro" : "Upgrade"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <AuthModal
        isVisible={authVisible}
        isDark={isDark}
        onClose={() => setAuthVisible(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <PaywallModal
        isVisible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onSubscribeSuccess={() => setPaywallVisible(false)}
      />

      <AppGuideModal isDark={isDark} />

      <Modal
        visible={proStatusVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProStatusVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setProStatusVisible(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: uiCard, borderColor: uiBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalIcon}>{"\u2B50"}</Text>
            <Text style={[styles.modalTitle, { color: uiText }]}>You are already a Pro member!</Text>
            <Text style={[styles.modalSubtitle, { color: isDark ? "#888" : "#666" }]}>
              All premium features are unlocked and ready to use.
            </Text>
            <View style={[styles.modalBadge, { backgroundColor: isDark ? "rgba(108,99,255,0.2)" : "rgba(108,99,255,0.1)" }]}>
              <Text style={styles.modalBadgeText}>Active Subscription</Text>
            </View>
            <Pressable style={styles.modalCloseBtn} onPress={() => setProStatusVisible(false)}>
              <Text style={styles.modalCloseBtnText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isReviewVisible}
        transparent
        animationType="fade"
        onRequestClose={handleUserDismissed}
      >
        <Pressable style={styles.modalOverlay} onPress={handleUserDismissed}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: uiCard, borderColor: uiBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalIcon}>{"\uD83D\uDE0A"}</Text>
            <Text style={[styles.modalTitle, { color: uiText }]}>Enjoying Jot?</Text>
            <Text style={[styles.modalSubtitle, { color: isDark ? "#888" : "#666" }]}>
              Your review helps us improve and grow!
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalPrimaryBtn} onPress={handleUserReviewed}>
                <Text style={styles.modalPrimaryBtnText}>Rate App</Text>
              </Pressable>
              <Pressable style={styles.modalSecondaryBtn} onPress={handleUserDismissed}>
                <Text style={[styles.modalSecondaryBtnText, { color: isDark ? "#888" : "#666" }]}>
                  Maybe Later
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerGreeting: {
    fontSize: 20,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnIcon: {
    fontSize: 18,
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingBottom: 20,
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
    gap: 2,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.4,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.5,
  },
  tabLabelActive: {
    color: Colors.accent,
    fontWeight: "700",
    opacity: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
  },
  modalIcon: { fontSize: 48, marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  modalSubtitle: { fontSize: 14, textAlign: "center", marginBottom: 20, lineHeight: 20 },
  modalBadge: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  modalBadgeText: { color: Colors.accent, fontSize: 13, fontWeight: "700" },
  modalCloseBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 14,
  },
  modalCloseBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalActions: {
    width: "100%",
    gap: 12,
  },
  modalPrimaryBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalPrimaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalSecondaryBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalSecondaryBtnText: { fontSize: 15, fontWeight: "600" },
});
