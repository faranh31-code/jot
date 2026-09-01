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
  pinned?: boolean;
  onPin?: () => void;
}

export default function EntryCard({ headline, content, createdAt, isDark, onPress, onDelete, pinned, onPin }: EntryCardProps) {
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
          <View style={styles.headlineRow}>
            {pinned && <Text style={styles.pinBadge}>{"\uD83D\uDCCC"}</Text>}
            <Text
              style={[styles.headline, { color: isDark ? Colors.dark.text : Colors.light.text }]}
              numberOfLines={1}
            >
              {headline}
            </Text>
          </View>
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
        <View style={styles.actionBtns}>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: pinned ? "rgba(108,99,255,0.2)" : "rgba(108,99,255,0.08)" }]}
            onPress={(e) => { e.stopPropagation(); onPin?.(); }}
            hitSlop={8}
          >
            <Text style={[styles.iconBtnText, pinned && { color: "#6C63FF" }]}>{"\uD83D\uDCCC"}</Text>
          </Pressable>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: "rgba(255,59,48,0.1)" }]}
            onPress={(e) => { e.stopPropagation(); onDelete(); }}
            hitSlop={8}
          >
            <Text style={[styles.iconBtnText, { color: "#FF3B30" }]}>{"\uD83D\uDDD1\uFE0F"}</Text>
          </Pressable>
        </View>
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
    flex: 1,
  },
  headlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  pinBadge: {
    fontSize: 10,
  },
  preview: {
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  date: {
    fontSize: FontSize.xs,
  },
  actionBtns: {
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 2,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: {
    fontSize: 13,
    color: "#888",
    fontWeight: "600",
  },
});
