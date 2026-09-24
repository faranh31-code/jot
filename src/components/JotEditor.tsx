import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Jot, JotCategory, CATEGORIES, StickyNoteColor, STICKY_NOTE_COLORS, STICKY_NOTE_NAMES, DEFAULT_NOTE_COLOR } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow, FontFamily } from '../constants/theme';
import AdBanner from './AdBanner';
import PaywallModal from './PaywallModal';
import { showRewardedInterstitial, loadRewardedInterstitial } from '../services/ads';

const FREE_TAG_LIMIT = 3;
const REWARDED_EXTRA_TAGS = 3;

const NOTE_COLOR_KEYS = Object.keys(STICKY_NOTE_COLORS) as StickyNoteColor[];

interface JotEditorProps {
  isVisible: boolean;
  isDark: boolean;
  isPro: boolean;
  onOpenPaywall: (trigger?: string) => void;
  editJot?: Jot | null;
  initialText?: string;
  onSave: (
    headline: string,
    body: string,
    tags: string[],
    category: JotCategory,
    isNote: boolean,
    noteColor: StickyNoteColor
  ) => void;
  onClose: () => void;
}

export default function JotEditor({
  isVisible,
  isDark,
  isPro,
  editJot,
  initialText,
  onSave,
  onClose,
}: JotEditorProps) {
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const bodyRef = useRef<TextInput>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState<string | undefined>(undefined);

  const openPaywall = (trigger?: string) => {
    setPaywallTrigger(trigger);
    setPaywallVisible(true);
  };

  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [category, setCategory] = useState<JotCategory>('personal');
  const [isNote, setIsNote] = useState(false);
  const [noteColor, setNoteColor] = useState<StickyNoteColor>(DEFAULT_NOTE_COLOR);
  const [copied, setCopied] = useState(false);
  const [extraTagsUnlocked, setExtraTagsUnlocked] = useState(false);
  const [rewardLoading, setRewardLoading] = useState(false);

  const effectiveTagLimit = isPro ? Infinity : extraTagsUnlocked ? FREE_TAG_LIMIT + REWARDED_EXTRA_TAGS : FREE_TAG_LIMIT;

  const handleWatchAdForTags = async () => {
    if (rewardLoading) return;
    setRewardLoading(true);
    const shown = await showRewardedInterstitial({
      onEarned: () => setExtraTagsUnlocked(true),
      onDismissed: () => setRewardLoading(false),
    });
    if (!shown) {
      setTimeout(() => setRewardLoading(false), 1000);
    } else {
      setTimeout(() => setRewardLoading(false), 60000);
    }
  };

  useEffect(() => {
    if (isVisible && !isPro) {
      loadRewardedInterstitial();
    }
  }, [isVisible, isPro]);

  const handleCopyBody = async () => {
    const content = headline.trim() || body.trim();
    if (!content) return;
    const full = headline.trim() ? `${headline.trim()}\n\n${body.trim()}` : body.trim();
    await Clipboard.setStringAsync(isPro ? full : `${full}\n\n— Made with Nota`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    if (isVisible) {
      setExtraTagsUnlocked(false);
      if (editJot) {
        setHeadline(editJot.headline);
        setBody(editJot.body);
        setTags([...editJot.tags]);
        setCategory(editJot.category);
        setIsNote(!!editJot.isNote);
        setNoteColor(editJot.noteColor || DEFAULT_NOTE_COLOR);
      } else if (initialText) {
        const lines = initialText.split('\n');
        if (lines.length > 1) {
          setHeadline(lines[0].trim());
          setBody(lines.slice(1).join('\n').trim());
        } else {
          setBody(initialText.trim());
        }
        setTags([]);
        setCategory('personal');
        setIsNote(false);
        setNoteColor(DEFAULT_NOTE_COLOR);
      } else {
        setHeadline('');
        setBody('');
        setTags([]);
        setCategory('personal');
        setIsNote(false);
        setNoteColor(DEFAULT_NOTE_COLOR);
      }
      setTagInput('');
    }
  }, [isVisible, editJot, initialText]);

  const handleTagInput = (text: string) => {
    if (text.endsWith(' ') || text.endsWith('\n')) {
      const newTag = text.trim().replace(/^#/, '');
      if (newTag && !tags.includes(newTag)) {
        if (!isPro && tags.length >= effectiveTagLimit) {
          setTagInput('');
          openPaywall('pro_feature');
          return;
        }
        setTags([...tags, newTag]);
      }
      setTagInput('');
    } else {
      setTagInput(text);
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  }

  const handleSave = () => {
    const trimmedHeadline = headline.trim();
    const trimmedBody = body.trim();
    if (!trimmedHeadline && !trimmedBody) return;
    onSave(trimmedHeadline, trimmedBody, tags, category, isNote, noteColor);
  }

  const isEditing = !!editJot;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.border,
              paddingTop: Spacing.lg + (Platform.OS === 'android' ? insets.top : 0),
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={[styles.cancelText, { color: theme.accentText }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {isEditing ? 'Edit' : 'New'}
          </Text>

          <TouchableOpacity
            onPress={handleSave}
            style={[
              styles.headerButton,
              styles.saveHeaderButton,
            ]}
          >
            <Text
              style={[
                styles.saveHeaderText,
                {
                  color: (!headline.trim() && !body.trim())
                    ? theme.textMuted
                    : theme.accentText,
                },
              ]}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <TextInput
            style={[
              styles.headlineInput,
              { color: theme.text, backgroundColor: 'transparent' },
            ]}
            placeholder="Title"
            placeholderTextColor={theme.textMuted}
            value={headline}
            onChangeText={setHeadline}
            returnKeyType="next"
            onSubmitEditing={() => bodyRef.current?.focus()}
            blurOnSubmit
            autoFocus={!editJot}
          />

          {(headline.trim() || body.trim()) && (
            <TouchableOpacity
              onPress={handleCopyBody}
              activeOpacity={0.7}
              style={[styles.copyBodyBtn, { backgroundColor: theme.input, borderColor: copied ? Colors.success : theme.border }]}
              accessibilityRole="button"
              accessibilityLabel="Copy to clipboard"
            >
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={14}
                color={copied ? Colors.success : theme.textSecondary}
              />
              <Text style={[styles.copyBodyText, { color: copied ? Colors.success : theme.textSecondary }]}>
                {copied ? 'Copied to Clipboard' : 'Copy to Clipboard'}
              </Text>
            </TouchableOpacity>
          )}

          <TextInput
            ref={bodyRef}
            style={[
              styles.bodyInput,
              { color: theme.text, backgroundColor: 'transparent' },
            ]}
            placeholder="Start typing or paste..."
            placeholderTextColor={theme.textMuted}
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.tagSection}>
            <View style={styles.tagInputRow}>
              <Ionicons
                name="pricetag-outline"
                size={16}
                color={theme.textMuted}
              />
              <TextInput
                style={[styles.tagInput, { color: theme.text }]}
                placeholder="#Add tag"
                placeholderTextColor={theme.textMuted}
                value={tagInput}
                onChangeText={handleTagInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {!isPro && tags.length >= FREE_TAG_LIMIT && !extraTagsUnlocked && (
              <TouchableOpacity onPress={() => openPaywall('pro_feature')} style={styles.tagLimitRow}>
                <Text style={[styles.tagLimitText, { color: theme.textMuted }]}>
                  {effectiveTagLimit} tags on Free —{' '}
                  <Text style={{ color: theme.accentText, fontWeight: '600' }}>upgrade for unlimited</Text>
                </Text>
              </TouchableOpacity>
            )}

            {!isPro && tags.length >= FREE_TAG_LIMIT && !extraTagsUnlocked && (
              <TouchableOpacity
                onPress={handleWatchAdForTags}
                disabled={rewardLoading}
                style={[styles.tagLimitRow, rewardLoading && { opacity: 0.6 }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.tagLimitText, { color: theme.textMuted }]}>
                  {rewardLoading ? 'Loading ad…' : (
                    <>
                      Want {REWARDED_EXTRA_TAGS} more?{' '}
                      <Text style={{ color: theme.accentText, fontWeight: '600' }}>watch an ad</Text>
                    </>
                  )}
                </Text>
              </TouchableOpacity>
            )}

            {!isPro && extraTagsUnlocked && (
              <Text style={[styles.tagLimitText, { color: theme.accentText }]}>
                {REWARDED_EXTRA_TAGS} extra tags unlocked for this note
              </Text>
            )}

            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => removeTag(tag)}
                    style={[styles.tagChip, { backgroundColor: theme.accentLight }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tagText, { color: theme.accentText }]}>
                      #{tag}
                    </Text>
                    <Ionicons name="close" size={12} color={theme.accentText} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.stickySection}>
            <Text style={[styles.stickyLabel, { color: theme.textMuted }]}>
              Type
            </Text>
            <View style={styles.stickyTypeRow}>
              <TouchableOpacity
                onPress={() => setIsNote(false)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: !isNote }}
                style={[
                  styles.stickyTypeBtn,
                  {
                    backgroundColor: !isNote ? theme.accentLight : theme.input,
                    borderColor: !isNote ? theme.accentBorder : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={!isNote ? theme.accentText : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.stickyTypeText,
                    { color: !isNote ? theme.accentText : theme.textSecondary },
                  ]}
                >
                  Card
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsNote(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isNote }}
                style={[
                  styles.stickyTypeBtn,
                  {
                    backgroundColor: isNote ? theme.accentLight : theme.input,
                    borderColor: isNote ? theme.accentBorder : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name="albums-outline"
                  size={16}
                  color={isNote ? theme.accentText : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.stickyTypeText,
                    { color: isNote ? theme.accentText : theme.textSecondary },
                  ]}
                >
                  Sticky note
                </Text>
              </TouchableOpacity>
            </View>

            {isNote && (
              <>
                <Text style={[styles.stickyHint, { color: theme.textSecondary }]}>
                  Sticky notes collect on your Sticky Wall — pick a color, they'll pop.
                </Text>
                <View style={styles.noteColorRow}>
                  {NOTE_COLOR_KEYS.map((key) => {
                    const { paper, ink } = STICKY_NOTE_COLORS[key];
                    const isActive = noteColor === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => setNoteColor(key)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`${key} sticky note color`}
                        accessibilityState={isActive ? { selected: true } : { selected: false }}
                        style={styles.noteSwatchWrap}
                      >
                        <View
                          style={[
                            styles.noteColorSwatch,
                            { backgroundColor: paper, borderColor: isActive ? theme.accentText : '#00000022' },
                            isActive && styles.noteColorSwatchActive,
                          ]}
                        >
                          {isActive && <Ionicons name="checkmark" size={15} color={ink} />}
                        </View>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.noteSwatchLabel,
                            { color: isActive ? theme.accentText : theme.textMuted },
                          ]}
                        >
                          {STICKY_NOTE_NAMES[key]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </View>

          <View style={styles.categorySection}>
            <Text style={[styles.categoryLabel, { color: theme.textMuted }]}>
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {CATEGORIES.map((cat) => {
                const isActive = category === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setCategory(cat.key)}
                    activeOpacity={0.7}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: isActive
                          ? Colors.accent
                          : theme.input,
                        borderColor: isActive
                          ? Colors.accent
                          : theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={14}
                      color={isActive ? Colors.onAccent : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryPillText,
                        {
                          color: isActive ? Colors.onAccent : theme.textSecondary,
                        },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomBar,
            {
              borderTopColor: theme.border,
              backgroundColor: theme.bg,
              paddingBottom: Spacing.md + insets.bottom,
            },
          ]}
        >
          {!isPro && <AdBanner isDark={isDark} position="bottom" />}
          <TouchableOpacity
            style={[styles.saveButton, { opacity: (!headline.trim() && !body.trim()) ? 0.5 : 1 }]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={!headline.trim() && !body.trim()}
          >
            <Ionicons name="checkmark" size={20} color={Colors.onAccent} />
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Update' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerButton: {
    paddingVertical: Spacing.sm,
    minWidth: 60,
    justifyContent: "center",
  },
  cancelText: {
    fontSize: FontSize.md,
  },
  headerTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.lg,
  },
  saveHeaderButton: {
    alignItems: 'flex-end',
  },
  saveHeaderText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  headlineInput: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.xxl,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  copyBodyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
    minHeight: 40,
  },
  copyBodyText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  bodyInput: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.lg,
    lineHeight: 26,
    minHeight: 200,
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  tagSection: {
    marginBottom: Spacing.lg,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tagInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.xs,
  },
  tagLimitRow: {
    marginBottom: Spacing.sm,
  },
  tagLimitText: {
    fontSize: FontSize.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  tagText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  stickySection: {
    marginBottom: Spacing.lg,
  },
  stickyLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  stickyTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stickyTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  stickyTypeText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  stickyHint: {
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
  },
  noteColorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  noteSwatchWrap: {
    alignItems: 'center',
    gap: Spacing.xs,
    width: '15%',
  },
  noteColorSwatch: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteColorSwatchActive: {
    transform: [{ scale: 1.12 }],
  },
  noteSwatchLabel: {
    fontSize: 9,
    textAlign: 'center',
  },
  categorySection: {
    marginTop: Spacing.sm,
  },
  categoryLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  categoryScroll: {
    gap: Spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  categoryPillText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  bottomBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  saveButtonText: {
    color: Colors.onAccent,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
});
