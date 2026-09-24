import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Jot, CATEGORY_COLORS, CATEGORY_LABELS, STICKY_NOTE_COLORS, DEFAULT_NOTE_COLOR } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow, FontFamily } from '../constants/theme';

interface StickyNoteCardProps {
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
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// Deterministic little tilt per note so the wall feels hand-placed.
function tiltFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % 9) - 4); // -4..+4 degrees
}

export default function StickyNoteCard({
  jot,
  isDark,
  onPress,
  onCopy,
  onShare,
  onInvite,
  onPin,
  onEdit,
  onDelete,
}: StickyNoteCardProps) {
  const theme = isDark ? Colors.dark : Colors.light;
  const palette = STICKY_NOTE_COLORS[jot.noteColor || DEFAULT_NOTE_COLOR];
  const rotation = useMemo(() => tiltFor(jot.id), [jot.id]);
  const categoryColor = CATEGORY_COLORS[jot.category];
  const inkFaint = 'rgba(0,0,0,0.42)';
  const inkMuted = 'rgba(0,0,0,0.6)';

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
    <View style={[styles.rotateWrap, { transform: [{ rotate: `${rotation}deg` }] }]}>
      {/* Masking-tape strip at the top of the note */}
      <View style={[styles.tapeTop, { backgroundColor: 'rgba(255,255,255,0.55)' }]} />

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        onLongPress={handleLongPress}
        style={[
          styles.container,
          {
            backgroundColor: palette.paper,
            borderColor: 'rgba(0,0,0,0.08)',
          },
        ]}
      >
        <View style={styles.categoryRow}>
          <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
          <Text style={[styles.categoryLabel, { color: inkMuted }]} numberOfLines={1}>
            {CATEGORY_LABELS[jot.category]}
          </Text>
        </View>

        <View style={styles.headerRow}>
          <View style={styles.pinSlot}>
            {jot.isPinned && <Ionicons name="pin" size={12} color={inkFaint} />}
          </View>
          <View style={styles.headerActions}>
            {jot.collaborators && jot.collaborators.length > 0 && (
              <Ionicons
                name="people"
                size={11}
                color={inkFaint}
                style={styles.headerIcon}
                accessibilityLabel={`${jot.collaborators.length} collaborators`}
              />
            )}
            <TouchableOpacity onPress={onInvite} hitSlop={8} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Invite collaboration">
              <Ionicons name="person-add-outline" size={13} color={inkFaint} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onShare} hitSlop={8} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Share as image">
              <Ionicons name="share-social-outline" size={13} color={inkFaint} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} hitSlop={8} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={`Delete ${jot.headline || 'Untitled'}`}>
              <Ionicons name="trash-outline" size={13} color={inkFaint} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.headline, { color: palette.ink }]} numberOfLines={2}>
          {jot.headline || 'Untitled'}
        </Text>

        <Text style={[styles.body, { color: inkMuted }]} numberOfLines={5}>
          {jot.body}
        </Text>

        <View style={styles.footer}>
          <Text style={[styles.timestamp, { color: inkFaint }]}>
            {getRelativeTime(jot.updatedAt || jot.createdAt)}
          </Text>
          {jot.tags && jot.tags.length > 0 && (
            <Text style={[styles.tagText, { color: inkFaint }]} numberOfLines={1}>
              #{jot.tags.slice(0, 2).join(' #')}
              {jot.tags.length > 2 ? ` +${jot.tags.length - 2}` : ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  rotateWrap: {
    marginBottom: Spacing.md,
  },
  tapeTop: {
    position: 'absolute',
    top: -8,
    left: '30%',
    width: '40%',
    height: 18,
    borderRadius: 2,
    zIndex: 2,
    transform: [{ rotate: '-2deg' }],
  },
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    minHeight: 132,
    overflow: 'hidden',
    ...Shadow.md,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  pinSlot: {
    width: 16,
    height: 18,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: Spacing.sm,
  },
  iconBtn: {
    marginLeft: Spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  headline: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.md,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  body: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: Spacing.sm,
  },
  timestamp: {
    fontSize: FontSize.xs,
  },
  tagText: {
    fontSize: FontSize.xs,
    maxWidth: '58%',
    marginLeft: Spacing.xs,
  },
});