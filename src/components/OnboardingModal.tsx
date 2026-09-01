import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, BorderRadius, Spacing, FontSize, FontFamily } from "../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SCREENS = [
  {
    title: "Save anything.\nInstantly.",
    subtitle:
      "Jot lets you capture thoughts, links, and notes the moment they hit.",
    mockup: "typing" as const,
  },
  {
    title: "Find it when\nyou need it.",
    subtitle:
      "Powerful search and tags mean nothing gets lost.",
    mockup: "search" as const,
  },
  {
    title: "Share, sync and\nkeep organized.",
    subtitle:
      "Share your jots as beautiful cards. Sync across devices.",
    mockup: "share" as const,
  },
];

interface OnboardingModalProps {
  isVisible: boolean;
  isDark: boolean;
  onComplete: () => void;
}

export default function OnboardingModal({
  isVisible,
  isDark,
  onComplete,
}: OnboardingModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const theme = isDark ? Colors.dark : Colors.light;

  const handleNext = () => {
    if (currentPage < SCREENS.length - 1) {
      setCurrentPage((p) => p + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const screen = SCREENS[currentPage];

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: theme.bg, opacity: fadeAnim },
        ]}
      >
        <Pressable style={styles.skipBtn} onPress={handleSkip}>
          <Text
            style={[styles.skipText, { color: theme.textSecondary }]}
          >
            Skip
          </Text>
        </Pressable>

        <View style={styles.content}>
          <View
            style={[
              styles.phoneMockup,
              {
                backgroundColor: isDark
                  ? Colors.dark.surface
                  : Colors.light.surface,
                borderColor: isDark ? Colors.dark.border : Colors.light.border,
              },
            ]}
          >
            {screen.mockup === "typing" && (
              <View style={styles.mockContent}>
                <View style={styles.mockHeader}>
                  <View
                    style={[
                      styles.mockDot,
                      { backgroundColor: Colors.accent },
                    ]}
                  />
                  <View
                    style={[
                      styles.mockLine,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(0,0,0,0.08)",
                        width: "60%",
                      },
                    ]}
                  />
                </View>
                <View
                  style={[
                    styles.mockLine,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.05)",
                      width: "90%",
                      marginTop: 12,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.mockLine,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.05)",
                      width: "75%",
                      marginTop: 8,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.mockCursor,
                    { backgroundColor: Colors.accent },
                  ]}
                />
              </View>
            )}

            {screen.mockup === "search" && (
              <View style={styles.mockContent}>
                <View
                  style={[
                    styles.mockSearchBar,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.08)",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.textMuted,
                      fontSize: 12,
                    }}
                  >
                    Search your jots...
                  </Text>
                </View>
                {[0.85, 0.7, 0.55].map((w, i) => (
                  <View
                    key={i}
                    style={[
                      styles.mockResult,
                      {
                        backgroundColor: isDark
                          ? Colors.dark.card
                          : Colors.light.card,
                        borderColor: isDark
                          ? Colors.dark.border
                          : Colors.light.border,
                        opacity: 1 - i * 0.2,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.mockLine,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.15)"
                            : "rgba(0,0,0,0.1)",
                          width: `${w * 100}%`,
                          height: 8,
                          marginBottom: 6,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.mockLine,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.05)",
                          width: `${w * 60}%`,
                          height: 6,
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>
            )}

            {screen.mockup === "share" && (
              <View style={styles.mockContent}>
                <View
                  style={[
                    styles.mockShareCard,
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
                      styles.mockLine,
                      {
                        backgroundColor: Colors.accent,
                        width: 40,
                        height: 4,
                        marginBottom: 12,
                        borderRadius: 2,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.mockLine,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.15)"
                          : "rgba(0,0,0,0.1)",
                        width: "70%",
                        height: 10,
                        marginBottom: 8,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.mockLine,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.05)",
                        width: "90%",
                        height: 6,
                        marginBottom: 4,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.mockLine,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.05)",
                        width: "65%",
                        height: 6,
                      },
                    ]}
                  />
                </View>
                <View style={styles.mockShareIcons}>
                  {(["share-social-outline", "link-outline", "document-outline"] as const).map(
                    (icon, i) => (
                      <View
                        key={i}
                        style={[
                          styles.mockShareIcon,
                          {
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)",
                          },
                        ]}
                      >
                        <Ionicons name={icon} size={17} color={theme.textSecondary} />
                      </View>
                    )
                  )}
                </View>
              </View>
            )}
          </View>

          <Text
            style={[
              styles.title,
              { color: theme.text },
            ]}
          >
            {screen.title}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: theme.textSecondary },
            ]}
          >
            {screen.subtitle}
          </Text>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.dots}>
            {SCREENS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i === currentPage
                        ? Colors.accent
                        : isDark
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.15)",
                    width: i === currentPage ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <Pressable style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {currentPage === SCREENS.length - 1
                ? "Start Jotting"
                : "Next"}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  phoneMockup: {
    width: 200,
    height: 260,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 16,
    marginBottom: 40,
  },
  mockContent: {
    flex: 1,
  },
  mockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  mockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mockLine: {
    height: 8,
    borderRadius: 4,
  },
  mockCursor: {
    width: 2,
    height: 14,
    borderRadius: 1,
    marginTop: 10,
  },
  mockSearchBar: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  mockResult: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
  },
  mockShareCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  mockShareIcons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  mockShareIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: 30,
    textAlign: "center",
    lineHeight: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  bottomSection: {
    alignItems: "center",
    paddingBottom: 60,
    paddingHorizontal: 32,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 64,
    borderRadius: BorderRadius.md,
    width: "100%",
    alignItems: "center",
  },
  nextBtnText: {
    color: Colors.onAccent,
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
});
