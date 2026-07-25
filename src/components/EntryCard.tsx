import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Colors, BorderRadius, Spacing, FontSize } from "../constants/theme";

interface EntryCardProps {
  headline: string;
  content: string;
  createdAt: number;
  isDark: boolean;
  onPress: () => void;
  onDelete: () => void;
}

export default function EntryCard({ headline, content, createdAt, isDark, onPress, onDelete }: EntryCardProps) {
  const date = new Date(createdAt);
  const preview = content.length > 80 ? content.slice(0, 80) + "..." : content;
  const cardBg = isDark ? Colors.dark.card : Colors.light.card;
  const borderColor = isDark ? Colors.dark.border : Colors.light.border;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: cardBg, borderColor }]}
      onPress={onPress}
    >
      <View style={styles.cardBody}>
        <View style={styles.cardContent}>
          <Text
            style={[styles.headline, { color: isDark ? Colors.dark.text : Colors.light.text }]}
            numberOfLines={1}
          >
            {headline}
          </Text>
          <Text
            style={[styles.preview, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}
            numberOfLines={2}
          >
            {preview}
          </Text>
          <Text
            style={[styles.date, { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }]}
          >
            {date.toLocaleDateString()}
          </Text>
        </View>
        <Pressable
          style={[styles.deleteBtn, { backgroundColor: "rgba(255,59,48,0.1)" }]}
          onPress={(e) => { e.stopPropagation(); onDelete(); }}
          hitSlop={8}
        >
          <Text style={styles.deleteBtnText}>{"\u2715"}</Text>
        </Pressable>
      </View>
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
  cardBody: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardContent: {
    flex: 1,
    marginRight: Spacing.sm,
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
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  deleteBtnText: {
    fontSize: 14,
    color: "#FF3B30",
    fontWeight: "600",
  },
});
