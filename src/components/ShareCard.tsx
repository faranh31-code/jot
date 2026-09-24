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
  PixelRatio,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Jot, ShareStyle, CATEGORY_COLORS } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow, FontFamily } from '../constants/theme';
import { trackEvent, trackFirstShare } from '../services/analytics';
import AdBanner from './AdBanner';
import PaywallModal from './PaywallModal';
import type { TextStyle } from 'react-native';

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
  { key: 'bold', label: 'Board', pro: true },
  { key: 'soft', label: 'Soft', pro: false },
];

interface SharePalette {
  bg: string;
  border: string | null;
  headline: string;
  body: string;
  tag: string;
  tagBg: string;
  tagBorder: string | null;
  meta: string;
  divider: string;
  headlineStyle?: Pick<TextStyle, 'fontStyle' | 'fontWeight' | 'textTransform' | 'letterSpacing'>;
  bodyStyle?: Pick<TextStyle, 'fontStyle' | 'fontWeight'>;
}

// Every palette must declare explicit, high-contrast text colors that can
// never collapse into the background — so all five styles always render the
// title, body, tags and footer regardless of the app theme.
function getSharePalette(style: ShareStyle, isDark: boolean): SharePalette {
  const t = isDark ? Colors.dark : Colors.light;
  switch (style) {
    case 'dark': // Midnight — warm near-black, matching the app's own dark theme.
      return {
        bg: Colors.dark.bg,
        border: '#2B2517',
        headline: Colors.dark.text,
        body: Colors.dark.textSecondary,
        tag: Colors.dark.accentText,
        tagBg: Colors.dark.accentLight,
        tagBorder: Colors.dark.accentBorder,
        meta: Colors.dark.textMuted,
        divider: Colors.dark.border,
      };
    case 'paper':
      return {
        bg: '#F5F0E8',
        border: '#E0D9C8',
        headline: '#2C2C2C',
        body: '#4A4A4A',
        tag: Colors.accent,
        tagBg: '#EADFCC',
        tagBorder: null,
        meta: '#A09080',
        divider: '#E0D9C8',
        headlineStyle: { fontStyle: 'italic' },
        bodyStyle: { fontStyle: 'italic' },
      };
    case 'gradient': // Brand — ink-amber card, unmistakably "from Nota".
      return {
        bg: Colors.accent,
        border: null,
        headline: Colors.onAccent,
        body: 'rgba(255,255,255,0.92)',
        tag: 'rgba(255,255,255,0.9)',
        tagBg: 'rgba(255,255,255,0.16)',
        tagBorder: null,
        meta: 'rgba(255,255,255,0.7)',
        divider: 'rgba(255,255,255,0.3)',
      };
    case 'bold':
      return {
        bg: '#000000',
        border: '#1F1F1F',
        headline: '#FFFFFF',
        body: '#FFFFFF',
        tag: '#FFD93D',
        tagBg: 'rgba(255,217,61,0.14)',
        tagBorder: null,
        meta: '#A0A0A0',
        divider: 'rgba(255,255,255,0.22)',
        headlineStyle: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 } as const,
        bodyStyle: { fontWeight: '300' },
      };
    case 'soft':
      // Soft is always a warm cream paper with dark ink — a fixed, readable
      // pairing so text can never disappear on either theme.
      return {
        bg: '#FBEEDD',
        border: '#EEDCC1',
        headline: '#3A2A1E',
        body: '#5A4532',
        tag: Colors.accent,
        tagBg: '#F1D9B6',
        tagBorder: null,
        meta: '#A08B6F',
        divider: '#E8D5B6',
      };
    case 'minimal':
    default:
      return {
        bg: isDark ? Colors.dark.surface : '#FFFFFF',
        border: isDark ? Colors.dark.border : '#E5E5EA',
        headline: t.text,
        body: t.textSecondary,
        tag: t.accentText,
        tagBg: t.accentLight,
        tagBorder: t.accentBorder,
        meta: t.textMuted,
        divider: isDark ? Colors.dark.border : '#E5E5EA',
      };
  }
}

export default function ShareCard({
  jot,
  isDark,
  isPro,
  onShareText,
  onShareImage,
  onCopy,
  onClose,
}: ShareCardProps) {
  const theme = isDark ? Colors.dark : Colors.light;
  const [selectedStyle, setSelectedStyle] = useState<ShareStyle>('minimal');
  const [capturing, setCapturing] = useState(false);
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState<string | undefined>(undefined);
  const palette = getSharePalette(selectedStyle, isDark);
  const previewRef = useRef<View>(null);

  const openPaywall = (trigger?: string) => {
    setPaywallTrigger(trigger);
    setPaywallVisible(true);
  };

  const categoryColor = CATEGORY_COLORS[jot.category];
  const date = new Date(jot.updatedAt || jot.createdAt);
  const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const handleShareImage = async () => {
    if (capturing) return;
    setCapturing(true);
    trackEvent({ event: 'share_started', params: { type: 'image' } });
    try {
      // Recreate the artwork size in native pixels so react-native-view-shot
      // renders text at the exact positions it occupies on screen (no DIP/px
      // rounding drift). Wait for the layout + font pass to settle first.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 250)))
      );
      const widthPx = layout ? layout.width * PixelRatio.get() : undefined;
      const heightPx = layout ? Math.max(Math.round(layout.height) * PixelRatio.get(), 1) : undefined;
      const uri = await captureRef(previewRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: widthPx,
        height: heightPx,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share from Nota' });
      }
      trackEvent({ event: 'share_completed', params: { type: 'image' } });
      trackEvent({ event: 'jot_card_created', params: { style: selectedStyle } });
      trackFirstShare();
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
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close share">
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Share
          </Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.previewContainer}>
            <View style={styles.previewShadow}>
              <View
                ref={previewRef}
                collapsable={false}
                onLayout={(e) => {
                  const { width, height } = e.nativeEvent.layout;
                  setLayout((prev) =>
                    prev && prev.width === width && prev.height === height
                      ? prev
                      : { width, height }
                  );
                }}
                style={[
                  styles.artwork,
                  {
                    backgroundColor: palette.bg,
                    borderColor: palette.border || 'transparent',
                    borderWidth: palette.border ? 1 : 0,
                  },
                ]}
              >
                <View style={[styles.artworkAccent, { backgroundColor: categoryColor }]} />

                <View style={styles.artworkContent}>
                  <Text
                    style={[
                      styles.artworkHeadline,
                      { color: palette.headline },
                      palette.headlineStyle,
                    ]}
                  >
                    {jot.headline || 'Untitled'}
                  </Text>

                  <Text style={[styles.artworkBody, { color: palette.body }, palette.bodyStyle]}>
                    {jot.body}
                  </Text>

                  {jot.tags.length > 0 && (
                    <View style={styles.artworkTags}>
                      {jot.tags.map((tag) => (
                        <View
                          key={tag}
                          style={[
                            styles.artworkTag,
                            {
                              backgroundColor: palette.tagBg,
                              borderColor: palette.tagBorder || 'transparent',
                              borderWidth: palette.tagBorder ? StyleSheet.hairlineWidth : 0,
                            },
                          ]}
                        >
                          <Text style={[styles.artworkTagText, { color: palette.tag }]}>
                            #{tag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={[styles.artworkFooter, { borderTopColor: palette.divider }]}>
                    <Text style={[styles.artworkMeta, { color: palette.meta }]}>
                      {formattedDate}
                    </Text>
                    {!isPro && (
                      <TouchableOpacity onPress={() => openPaywall('branding')} hitSlop={8}>
                        <Text style={[styles.artworkMeta, styles.artworkBrand, { color: palette.meta }]}>
                          Made with Nota
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
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
                const p = getSharePalette(s.key, isDark);
                return (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() =>
                      isLocked ? openPaywall('jot_card_style') : setSelectedStyle(s.key)
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
                        {
                          backgroundColor: p.bg,
                          borderColor: p.border || 'transparent',
                          borderWidth: p.border ? 1 : 0,
                        },
                      ]}
                    >
                      <View style={[styles.stylePreviewAccent, { backgroundColor: categoryColor }]} />
                      <View style={styles.stylePreviewLines}>
                        <View style={[styles.stylePreviewLine, { backgroundColor: p.headline }]} />
                        <View style={[styles.stylePreviewLine, styles.stylePreviewLineShort, { backgroundColor: p.body }]} />
                      </View>
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
        {!isPro && <AdBanner isDark={isDark} position="bottom" />}
      </View>
      <PaywallModal
        isVisible={paywallVisible}
        isDark={isDark}
        trigger={paywallTrigger}
        onClose={() => setPaywallVisible(false)}
      />
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
    justifyContent: 'center',
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
  previewShadow: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.lg,
    ...Shadow.md,
  },
  artwork: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  artworkAccent: {
    height: 6,
    width: '100%',
  },
  artworkContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  artworkHeadline: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.xxl,
    lineHeight: 32,
    marginBottom: Spacing.sm,
  },
  artworkBody: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.lg,
    lineHeight: 26,
  },
  artworkTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  artworkTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.full,
  },
  artworkTagText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  artworkFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  artworkMeta: {
    fontSize: FontSize.xs,
  },
  artworkBrand: {
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
  stylePreviewLines: {
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 8,
    width: '100%',
  },
  stylePreviewLine: {
    height: 3,
    borderRadius: 2,
    width: '70%',
  },
  stylePreviewLineShort: {
    width: '45%',
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