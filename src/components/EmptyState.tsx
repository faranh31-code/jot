import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing, FontSize } from "../constants/theme";

interface EmptyStateProps {
  isDark: boolean;
}

export default function EmptyState({ isDark }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{"\uD83D\uDCCB"}</Text>
      <Text style={[styles.title, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
        No entries yet
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary },
        ]}
      >
        Tap the + button to create your first text entry
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
});
