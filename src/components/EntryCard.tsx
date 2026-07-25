import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Colors, BorderRadius, Spacing, FontSize } from "../constants/theme";

interface EntryCardProps {
  headline: string;
  content: string;
  createdAt: number;
  isDark: boolean;
  onPress: () => void;
}

export default function EntryCard({ headline, content, createdAt, isDark, onPress }: EntryCardProps) {
  const date = new Date(createdAt);
  const preview = content.length > 80 ? content.slice(0, 80) + "..." : content;

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: isDark ? Colors.dark.card : Colors.light.card,
          borderColor: isDark ? Colors.dark.border : Colors.light.border,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[styles.headline, { color: isDark ? Colors.dark.text : Colors.light.text }]}
        numberOfLines={1}
      >
        {headline}
      </Text>
      <Text
        style={[
          styles.preview,
          { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary },
        ]}
        numberOfLines={2}
      >
        {preview}
      </Text>
      <Text
        style={[
          styles.date,
          { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted },
        ]}
      >
        {date.toLocaleDateString()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  headline: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  preview: {
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  date: {
    fontSize: FontSize.xs,
  },
});
