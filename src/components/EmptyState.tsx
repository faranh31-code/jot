import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize } from "../constants/theme";

interface EmptyStateProps {
  isDark: boolean;
}

export default function EmptyState({ isDark }: EmptyStateProps) {
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: theme.accentLight }]}>
        <Ionicons name="clipboard-outline" size={44} color={theme.accentText} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>
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
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
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
