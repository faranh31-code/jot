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
import { storageGet, storageSet } from "../services/storage";

const { width } = Dimensions.get("window");

const STEPS: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; description: string }[] = [
  {
    icon: "create-outline",
    title: "Create Entries",
    description: "Tap the + button to create a new text entry. Add a headline and your content.",
  },
  {
    icon: "copy-outline",
    title: "Quick Copy",
    description: "Tap any entry to view full details and instantly copy to clipboard.",
  },
  {
    icon: "cloud-outline",
    title: "Cloud Sync",
    description: "Sign in to sync your entries across all your devices with Firebase.",
  },
];

const GUIDE_KEY = "app_guide_seen";

interface AppGuideModalProps {
  isDark: boolean;
}

export default function AppGuideModal({ isDark }: AppGuideModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  async function checkFirstLaunch() {
    const seen = await storageGet(GUIDE_KEY);
    if (!seen) {
      setTimeout(() => setIsVisible(true), 800);
    }
  }

  async function handleClose() {
    await storageSet(GUIDE_KEY, "true");
    setIsVisible(false);
  }

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
      ]).start(() => {
        setCurrentStep((prev) => prev + 1);
        slideAnim.setValue(20);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
      });
    } else {
      handleClose();
    }
  }

  if (!isVisible) return null;

  const step = STEPS[currentStep];

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? Colors.dark.card : Colors.light.card,
              borderColor: isDark ? Colors.dark.border : Colors.light.border,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View
            style={[
              styles.stepIconWrap,
              { backgroundColor: isDark ? Colors.dark.accentLight : Colors.light.accentLight },
            ]}
          >
            <Ionicons
              name={step.icon}
              size={30}
              color={isDark ? Colors.dark.accentText : Colors.light.accentText}
            />
          </View>
          <Text style={[styles.stepTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            {step.title}
          </Text>
          <Text
            style={[
              styles.stepDescription,
              { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary },
            ]}
          >
            {step.description}
          </Text>

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: isDark ? Colors.dark.border : Colors.light.border },
                  i === currentStep && styles.dotActive,
                ]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.skipBtn} onPress={handleClose}>
              <Text style={[styles.skipBtnText, { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }]}>
                Skip
              </Text>
            </Pressable>
            <Pressable style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>
                {currentStep === STEPS.length - 1 ? "Get Started" : "Next"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
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
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1,
  },
  stepIconWrap: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  stepTitle: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.xxl,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  dots: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.accent,
    width: 24,
  },
  actions: {
    flexDirection: "row",
    width: "100%",
    gap: Spacing.sm,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  skipBtnText: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  nextBtn: {
    flex: 2,
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  nextBtnText: {
    color: Colors.onAccent,
    fontSize: FontSize.md,
    fontWeight: "700",
  },
});
