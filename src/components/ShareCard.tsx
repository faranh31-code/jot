import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Jot, ShareStyle, CATEGORY_COLORS } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow, FontFamily } from '../constants/theme';
import { trackEvent } from '../services/analytics';

interface ShareCardProps {
  jot: Jot;
  isDark: boolean;
  isPro: boolean;
  onOpenPaywall: (trigger?: string) => void;
  onShareText: () => void;
  onShareImage: () => void;
  onCopy: () => void;
  onClose: () => void;
}

const SHARE_STYLES: { key: ShareStyle; label: string; pro: boolean }[] = [
  { key: 'minimal', label: 'Minimal', pro: false },
  { key: 'dark', label: 'Midnight', pro: true },
  { key: 'paper', label: 'Paper', pro: true },
  { key: 'gradient', label: 'Brand', pro: true },
  { key: 'bold', label: 'Bold', pro: true },
  { key: 'soft', label: 'Soft', pro: false },
];

function getShareCardStyles(
  style: ShareStyle,
  isDark: boolean,
): { container: object; headline: object; body: object; tag: object; meta: object; bg: string } {
  const base: object = {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  };

  const headlineFont = { fontFamily: FontFamily.display };
  const bodyFont = { fontFamily: FontFamily.sans };

  switch (style) {
    case 'dark':
      // Midnight — warm near-black, matching the app's own dark theme rather than a cold navy.
      return {
        container: { ...base, backgroundColor: Colors.dark.bg },
        headline: { ...headlineFont, color: Colors.dark.text, fontSize: FontSize.xxl },
        body: { ...bodyFont, color: Colors.dark.textSecondary, fontSize: FontSize.md, lineHeight: 24 },
        tag: { color: Colors.dark.accentText },
        meta: { color: Colors.dark.textMuted },
        bg: Colors.dark.bg,
      };
    case 'paper':
      return {
        container: { ...base, backgroundColor: '#F5F0E8', borderWidth: 1, borderColor: '#E0D9C8' },
        headline: { ...headlineFont, color: '#2C2C2C', fontSize: FontSize.xxl, fontStyle: 'italic' },
        body: { ...bodyFont, color: '#4A4A4A', fontSize: FontSize.md, lineHeight: 24, fontStyle: 'italic' },
        tag: { color: Colors.accent },
        meta: { color: '#A09080' },
        bg: '#F5F0E8',
      };
    case 'gradient':
      // Brand — the app's own ink-amber, for a jot that reads unmistakably as "from Jot".
      return {
        container: { ...base, backgroundColor: Colors.accent },
        headline: { ...headlineFont, color: Colors.onAccent, fontSize: FontSize.xxl },
        body: { ...bodyFont, color: 'rgba(255,255,255,0.9)', fontSize: FontSize.md, lineHeight: 24 },
        tag: { color: 'rgba(255,255,255,0.75)' },
        meta: { color: 'rgba(255,255,255,0.6)' },
        bg: Colors.accent,
      };
    case 'bold':
      return {
        container: { ...base, backgroundColor: '#000000' },
        headline: { ...headlineFont, color: '#FFFFFF', fontSize: FontSize.xxl, textTransform: 'uppercase', letterSpacing: 1 },
        body: { ...bodyFont, color: '#FFFFFF', fontSize: FontSize.md, lineHeight: 24, fontWeight: '300' },
        tag: { color: '#FFD93D' },
        meta: { color: '#888888' },
        bg: '#000000',
      };
    case 'soft':
      return {
        container: { ...base, backgroundColor: isDark ? '#33241A' : '#FBEEDD' },
        headline: { ...headlineFont, color: isDark ? Colors.dark.text : Colors.light.text, fontSize: FontSize.xxl },
        body: { ...bodyFont, color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary, fontSize: FontSize.md, lineHeight: 24 },
        tag: { color: isDark ? Colors.dark.accentText : Colors.light.accentText },
        meta: { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted },
        bg: isDark ? '#33241A' : '#FBEEDD',
      };
    case 'minimal':
    default:
      return {
        container: { ...base, backgroundColor: isDark ? Colors.dark.surface : '#FFFFFF', borderWidth: 1, borderColor: isDark ? Colors.dark.border : '#E5E5EA' },
        headline: { ...headlineFont, color: isDark ? Colors.dark.text : Colors.light.text, fontSize: FontSize.xxl },
        body: { ...bodyFont, color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary, fontSize: FontSize.md, lineHeight: 24 },
        tag: { color: isDark ? Colors.dark.accentText : Colors.light.accentText },
        meta: { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted },
        bg: isDark ? Colors.dark.surface : '#FFFFFF',
      };
  }
}

export default function ShareCard({
  jot,
  isDark,
  isPro,
  onOpenPaywall,
  onShareText,
  onShareImage,
  onCopy,
  onClose,
}: ShareCardProps) {
  const theme = isDark ? Colors.dark : Colors.light;
  const [selectedStyle, setSelectedStyle] = useState<ShareStyle>('minimal');
  const [capturing, setCapturing] = useState(false);
  const shareStyles = getShareCardStyles(selectedStyle, isDark);
  const previewRef = useRef<View>(null);

  const categoryColor = CATEGORY_COLORS[jot.category];
  const date = new Date(jot.updatedAt || jot.createdAt);
  const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const handleShareImage = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const uri = await captureRef(previewRef, { format: 'png', quality: 1 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share from Jot' });
      }
      trackEvent({ event: 'jot_card_created', params: { style: selectedStyle } });
      onShareImage();
    } catch (error) {
      console.warn('[ShareCard] Image capture failed:', error);
      Alert.alert('Couldn\'t create image', 'Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Share Jot
          </Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.previewContainer}>
            <View ref={previewRef} collapsable={false} style={[styles.previewCard, shareStyles.container]}>
              <View style={[styles.previewAccent, { backgroundColor: categoryColor }]} />

              <Text style={shareStyles.headline}>{jot.headline || 'Untitled'}</Text>

              <Text style={[shareStyles.body, styles.previewBody]}>
                {jot.body}
              </Text>

              {jot.tags.length > 0 && (
                <View style={styles.previewTags}>
                  {jot.tags.map((tag) => (
                    <Text key={tag} style={[shareStyles.tag, styles.previewTag]}>
                      #{tag}
                    </Text>
                  ))}
                </View>
              )}

              <View style={styles.previewFooter}>
                <Text style={shareStyles.meta}>{formattedDate}</Text>
                {!isPro && (
                  <TouchableOpacity onPress={() => onOpenPaywall('branding')} hitSlop={8}>
                    <Text style={[styles.branding, shareStyles.meta]}>
                      Made with Jot
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Style
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.styleScroll}
            >
              {SHARE_STYLES.map((s) => {
                const isActive = selectedStyle === s.key;
                const isLocked = s.pro && !isPro;
                const preview = getShareCardStyles(s.key, isDark);
                return (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() =>
                      isLocked ? onOpenPaywall('jot_card_style') : setSelectedStyle(s.key)
                    }
                    activeOpacity={0.7}
                    style={[
                      styles.styleOption,
                      {
                        borderColor: isActive ? theme.accentText : theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.stylePreview,
                        { backgroundColor: preview.bg },
                      ]}
                    >
                      <View style={[styles.stylePreviewAccent, { backgroundColor: categoryColor }]} />
                      {isLocked && (
                        <View style={styles.lockBadge}>
                          <Ionicons name="lock-closed" size={12} color={theme.textMuted} />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.styleLabel,
                        {
                          color: isActive ? theme.accentText : theme.textSecondary,
                          fontWeight: isActive ? '600' : '400',
                        },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryAction, capturing && styles.actionButtonDisabled]}
              onPress={handleShareImage}
              activeOpacity={0.8}
              disabled={capturing}
            >
              {capturing ? (
                <ActivityIndicator size="small" color={Colors.onAccent} />
              ) : (
                <Ionicons name="image-outline" size={20} color={Colors.onAccent} />
              )}
              <Text style={styles.primaryActionText}>
                {capturing ? 'Creating...' : 'Share as Image'}
              </Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryAction, { backgroundColor: theme.input, borderColor: theme.border }]}
                onPress={onShareText}
                activeOpacity={0.8}
              >
                <Ionicons name="text-outline" size={18} color={theme.text} />
                <Text style={[styles.secondaryActionText, { color: theme.text }]}>
                  Text
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryAction, { backgroundColor: theme.input, borderColor: theme.border }]}
                onPress={onCopy}
                activeOpacity={0.8}
              >
                <Ionicons name="copy-outline" size={18} color={theme.text} />
                <Text style={[styles.secondaryActionText, { color: theme.text }]}>
                  Copy
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.lg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  previewContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  previewCard: {
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    ...Shadow.md,
  },
  previewAccent: {
    height: 3,
    width: '100%',
  },
  previewBody: {
    marginTop: Spacing.sm,
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  previewTag: {
    fontSize: FontSize.sm,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  branding: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginLeft: Spacing.lg,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  styleScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  styleOption: {
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    minWidth: 72,
  },
  stylePreview: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stylePreviewAccent: {
    width: '100%',
    height: 3,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  lockBadge: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleLabel: {
    fontSize: FontSize.xs,
  },
  actions: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  primaryAction: {
    backgroundColor: Colors.accent,
    ...Shadow.sm,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  primaryActionText: {
    color: Colors.onAccent,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  secondaryAction: {
    flex: 1,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
});
