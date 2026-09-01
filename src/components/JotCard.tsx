import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Jot, CATEGORY_COLORS, JotCategory } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow, FontFamily } from '../constants/theme';

interface JotCardProps {
  jot: Jot;
  isDark: boolean;
  onPress: () => void;
  onCopy: () => void;
  onShare: () => void;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

export default function JotCard({
  jot,
  isDark,
  onPress,
  onCopy,
  onShare,
  onPin,
  onEdit,
  onDelete,
}: JotCardProps) {
  const theme = isDark ? Colors.dark : Colors.light;
  const categoryColor = CATEGORY_COLORS[jot.category];

  const handleLongPress = () => {
    const buttons = [
      { text: 'Copy', onPress: onCopy },
      { text: 'Share', onPress: onShare },
      { text: jot.isPinned ? 'Unpin' : 'Pin', onPress: onPin },
      { text: 'Edit', onPress: onEdit },
      {
        text: 'Delete',
        style: 'destructive' as const,
        onPress: () => {
          Alert.alert('Delete Jot', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' as const, onPress: () => {} },
    ];

    Alert.alert('Jot', jot.headline || 'Untitled', buttons);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={handleLongPress}
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        isDark ? Shadow.sm : { ...Shadow.sm, shadowColor: '#000' },
      ]}
    >
      <View style={[styles.categoryBar, { backgroundColor: categoryColor }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[styles.headline, { color: theme.text }]}
            numberOfLines={1}
          >
            {jot.headline || 'Untitled'}
          </Text>
          {jot.isPinned && (
            <Ionicons
              name="pin"
              size={14}
              color={theme.accentText}
              style={styles.pinIcon}
              accessibilityLabel="Pinned"
            />
          )}
        </View>

        <Text
          style={[styles.body, { color: theme.textSecondary }]}
          numberOfLines={3}
        >
          {jot.body}
        </Text>

        <View style={styles.footer}>
          <Text style={[styles.timestamp, { color: theme.textMuted }]}>
            {getRelativeTime(jot.updatedAt || jot.createdAt)}
          </Text>

          {jot.tags && jot.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {jot.tags.slice(0, 2).map((tag) => (
                <View
                  key={tag}
                  style={[styles.tagChip, { backgroundColor: theme.accentLight }]}
                >
                  <Text style={[styles.tagText, { color: theme.accentText }]}>
                    #{tag}
                  </Text>
                </View>
              ))}
              {jot.tags.length > 2 && (
                <Text style={[styles.moreTags, { color: theme.textMuted }]}>
                  +{jot.tags.length - 2}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  categoryBar: {
    width: 3,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  headline: {
    flex: 1,
    fontFamily: FontFamily.display,
    fontSize: FontSize.lg,
  },
  pinIcon: {
    marginLeft: Spacing.sm,
    transform: [{ rotate: '45deg' }],
  },
  body: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.md,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timestamp: {
    fontSize: FontSize.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.xs,
  },
  tagText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  moreTags: {
    fontSize: FontSize.xs,
    marginLeft: Spacing.xs,
  },
});
