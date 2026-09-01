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
import { Ionicons } from '@expo/vector-icons';
import { Jot, JotCategory, CATEGORIES } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, Shadow, FontFamily } from '../constants/theme';

const FREE_TAG_LIMIT = 3;

interface JotEditorProps {
  isVisible: boolean;
  isDark: boolean;
  isPro: boolean;
  onOpenPaywall: (trigger?: string) => void;
  editJot?: Jot | null;
  initialText?: string;
  onSave: (headline: string, body: string, tags: string[], category: JotCategory) => void;
  onClose: () => void;
}

export default function JotEditor({
  isVisible,
  isDark,
  isPro,
  onOpenPaywall,
  editJot,
  initialText,
  onSave,
  onClose,
}: JotEditorProps) {
  const theme = isDark ? Colors.dark : Colors.light;
  const bodyRef = useRef<TextInput>(null);

  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [category, setCategory] = useState<JotCategory>('personal');

  useEffect(() => {
    if (isVisible) {
      if (editJot) {
        setHeadline(editJot.headline);
        setBody(editJot.body);
        setTags([...editJot.tags]);
        setCategory(editJot.category);
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
      } else {
        setHeadline('');
        setBody('');
        setTags([]);
        setCategory('personal');
      }
      setTagInput('');
    }
  }, [isVisible, editJot, initialText]);

  const handleTagInput = (text: string) => {
    if (text.endsWith(' ') || text.endsWith('\n')) {
      const newTag = text.trim().replace(/^#/, '');
      if (newTag && !tags.includes(newTag)) {
        if (!isPro && tags.length >= FREE_TAG_LIMIT) {
          setTagInput('');
          onOpenPaywall('pro_feature');
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
    onSave(trimmedHeadline, trimmedBody, tags, category);
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
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={[styles.cancelText, { color: theme.accentText }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {isEditing ? 'Edit Jot' : 'New Jot'}
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

            {!isPro && tags.length >= FREE_TAG_LIMIT && (
              <TouchableOpacity onPress={() => onOpenPaywall('pro_feature')} style={styles.tagLimitRow}>
                <Text style={[styles.tagLimitText, { color: theme.textMuted }]}>
                  {FREE_TAG_LIMIT} tags on Free —{' '}
                  <Text style={{ color: theme.accentText, fontWeight: '600' }}>upgrade for unlimited</Text>
                </Text>
              </TouchableOpacity>
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

        <View style={[styles.bottomBar, { borderTopColor: theme.border, backgroundColor: theme.bg }]}>
          <TouchableOpacity
            style={[styles.saveButton, { opacity: (!headline.trim() && !body.trim()) ? 0.5 : 1 }]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={!headline.trim() && !body.trim()}
          >
            <Ionicons name="checkmark" size={20} color={Colors.onAccent} />
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Update Jot' : 'Save Jot'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingBottom: Spacing.xl,
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
