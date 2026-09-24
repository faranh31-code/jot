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
import { Jot, CATEGORY_COLORS, CATEGORY_LABELS, JotCategory } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow, FontFamily } from '../constants/theme';

interface JotCardProps {
  jot: Jot;
  isDark: boolean;
  onPress: () => void;
  onCopy: () => void;
  onShare: () => void;
  onInvite: () => void;
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
  onInvite,
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
      { text: 'Invite Collaboration', onPress: onInvite },
      { text: jot.isPinned ? 'Unpin' : 'Pin', onPress: onPin },
      { text: 'Edit', onPress: onEdit },
      { text: 'Delete', style: 'destructive' as const, onPress: onDelete },
      { text: 'Cancel', style: 'cancel' as const, onPress: () => {} },
    ];

    Alert.alert('Nota', jot.headline || 'Untitled', buttons);
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
        <View style={styles.categoryRow}>
          <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
          <Text style={[styles.categoryLabel, { color: theme.textSecondary }]} numberOfLines={1}>
            {CATEGORY_LABELS[jot.category]}
          </Text>
        </View>

        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.headline, { color: theme.text }]}
              numberOfLines={3}
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
            {jot.collaborators && jot.collaborators.length > 0 && (
              <Ionicons
                name="people"
                size={13}
                color={theme.textMuted}
                style={styles.pinIcon}
                accessibilityLabel={`${jot.collaborators.length} collaborators`}
              />
            )}
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={onInvite}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Invite collaboration"
            >
              <Ionicons name="person-add-outline" size={14} color={theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onShare}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Share as image"
            >
              <Ionicons name="share-social-outline" size={14} color={theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDelete}
              hitSlop={8}
              style={styles.deleteBtn}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${jot.headline || 'Untitled'}`}
            >
              <Ionicons name="trash-outline" size={15} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
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
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  categoryBar: {
    width: 3,
  },
  content: {
    flex: 1,
    padding: Spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.18)',
  },
  categoryLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  header: {
    marginBottom: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headline: {
    flex: 1,
    fontFamily: FontFamily.display,
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  pinIcon: {
    marginLeft: Spacing.sm,
    transform: [{ rotate: '45deg' }],
  },
  iconBtn: {
    marginLeft: Spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    marginLeft: Spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    lineHeight: 18,
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
