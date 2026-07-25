import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, StatusBar, Modal } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import HomeScreen from "./src/screens/HomeScreen";
import PaywallModal from "./src/components/PaywallModal";
import AdBanner from "./src/components/AdBanner";
import { useSubscription } from "./src/hooks/useSubscription";
import { useReviewPrompt } from "./src/hooks/useReviewPrompt";
import { initFirebase } from "./src/services/firebase";
import { Colors } from "./src/constants/theme";

export default function App() {
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [proStatusVisible, setProStatusVisible] = useState(false);

  const { isPro } = useSubscription();
  const { isModalVisible: isReviewVisible, triggerHappyMoodReview, handleUserReviewed, handleUserDismissed } = useReviewPrompt();

  useEffect(() => {
    initFirebase();
  }, []);

  const isDark = true;
  const uiBg = isDark ? Colors.dark.bg : Colors.light.bg;
  const uiBorder = isDark ? Colors.dark.border : Colors.light.border;
  const uiCard = isDark ? Colors.dark.card : Colors.light.card;
  const uiText = isDark ? Colors.dark.text : Colors.light.text;

  const handleProTab = useCallback(() => {
    if (isPro) {
      setProStatusVisible(true);
    } else {
      setPaywallVisible(true);
    }
  }, [isPro]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={uiBg} />

      <View style={[styles.container, { backgroundColor: uiBg }]}>
        <AdBanner isPro={isPro} isDark={isDark} />

        <HomeScreen isDark={isDark} onOpenPaywall={() => setPaywallVisible(true)} />

        <View
          style={[
            styles.tabBar,
            { backgroundColor: uiBg, borderTopColor: uiBorder },
          ]}
        >
          <Pressable
            style={[
              styles.tab,
              styles.tabActive,
              { backgroundColor: "rgba(108,99,255,0.15)" },
            ]}
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
      </View>

      <PaywallModal
        isVisible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onSubscribeSuccess={() => setPaywallVisible(false)}
      />

      <Modal
        visible={proStatusVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProStatusVisible(false)}
      >
        <Pressable style={styles.proOverlay} onPress={() => setProStatusVisible(false)}>
          <Pressable
            style={[styles.proCard, { backgroundColor: uiCard, borderColor: uiBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.proIcon}>{"\u2B50"}</Text>
            <Text style={[styles.proTitle, { color: uiText }]}>
              You are already a Pro member!
            </Text>
            <Text style={[styles.proSubtitle, { color: isDark ? "#888" : "#666" }]}>
              All premium features are unlocked and ready to use.
            </Text>
            <View
              style={[
                styles.proBadge,
                { backgroundColor: isDark ? "rgba(108,99,255,0.2)" : "rgba(108,99,255,0.1)" },
              ]}
            >
              <Text style={styles.proBadgeText}>Active Subscription</Text>
            </View>
            <Pressable
              style={styles.proCloseBtn}
              onPress={() => setProStatusVisible(false)}
            >
              <Text style={styles.proCloseBtnText}>Done</Text>
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
        <Pressable style={styles.reviewOverlay} onPress={handleUserDismissed}>
          <Pressable
            style={[styles.reviewCard, { backgroundColor: uiCard, borderColor: uiBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.reviewIcon}>{"\uD83D\uDE0A"}</Text>
            <Text style={[styles.reviewTitle, { color: uiText }]}>
              Enjoying Text Saver?
            </Text>
            <Text style={[styles.reviewSubtitle, { color: isDark ? "#888" : "#666" }]}>
              Your review helps us improve and grow!
            </Text>
            <View style={styles.reviewActions}>
              <Pressable style={styles.reviewBtnPrimary} onPress={handleUserReviewed}>
                <Text style={styles.reviewBtnPrimaryText}>Rate App</Text>
              </Pressable>
              <Pressable style={styles.reviewBtnSecondary} onPress={handleUserDismissed}>
                <Text style={[styles.reviewBtnSecondaryText, { color: isDark ? "#888" : "#666" }]}>
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
  tabActive: {
    opacity: 1,
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
  proOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  proCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
  },
  proIcon: { fontSize: 48, marginBottom: 16 },
  proTitle: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  proSubtitle: { fontSize: 14, textAlign: "center", marginBottom: 20, lineHeight: 20 },
  proBadge: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  proBadgeText: { color: Colors.accent, fontSize: 13, fontWeight: "700" },
  proCloseBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 14,
  },
  proCloseBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  reviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  reviewCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
  },
  reviewIcon: { fontSize: 48, marginBottom: 16 },
  reviewTitle: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  reviewSubtitle: { fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  reviewActions: {
    width: "100%",
    gap: 12,
  },
  reviewBtnPrimary: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  reviewBtnPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  reviewBtnSecondary: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  reviewBtnSecondaryText: { fontSize: 15, fontWeight: "600" },
});
