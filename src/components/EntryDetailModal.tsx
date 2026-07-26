import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Keyboard,
} from "react-native";
import { Colors, BorderRadius, Spacing, FontSize } from "../constants/theme";

interface EntryDetailModalProps {
  isVisible: boolean;
  headline: string;
  content: string;
  entryId: string;
  isDark: boolean;
  onClose: () => void;
  onEdit: (id: string, headline: string, content: string) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string) => void;
}

export default function EntryDetailModal({
  isVisible,
  headline,
  content,
  entryId,
  isDark,
  onClose,
  onEdit,
  onDelete,
  onCopy,
}: EntryDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editHeadline, setEditHeadline] = useState(headline);
  const [editContent, setEditContent] = useState(content);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setEditHeadline(headline);
      setEditContent(content);
      setIsEditing(false);
      setCopySuccess(false);
    }
  }, [isVisible, headline, content]);

  const handleCopy = useCallback(() => {
    onCopy(content);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, [content, onCopy]);

  const handleTapToEdit = useCallback(() => {
    setEditHeadline(headline);
    setEditContent(content);
    setIsEditing(true);
  }, [headline, content]);

  const handleSaveEdit = useCallback(() => {
    if (!editHeadline.trim() || !editContent.trim()) return;
    Keyboard.dismiss();
    onEdit(entryId, editHeadline.trim(), editContent.trim());
    setIsEditing(false);
  }, [entryId, editHeadline, editContent, onEdit]);

  const handleCancelEdit = useCallback(() => {
    Keyboard.dismiss();
    setEditHeadline(headline);
    setEditContent(content);
    setIsEditing(false);
  }, [headline, content]);

  const bg = isDark ? Colors.dark.bg : Colors.light.card;
  const text = isDark ? Colors.dark.text : Colors.light.text;
  const muted = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.light.border;
  const inputBg = isDark ? Colors.dark.card : "#f0f0f0";
  const placeholderColor = isDark ? Colors.dark.textMuted : Colors.light.textMuted;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[styles.container, { backgroundColor: bg, borderColor: border }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.topBar}>
            {isEditing ? (
              <TextInput
                style={[styles.headlineInput, { color: text, backgroundColor: inputBg, borderColor: border }]}
                value={editHeadline}
                onChangeText={setEditHeadline}
                placeholder="Headline"
                placeholderTextColor={placeholderColor}
                maxLength={100}
                returnKeyType="next"
                blurOnSubmit={false}
              />
            ) : (
              <Pressable onPress={handleTapToEdit} style={styles.headlinePressable}>
                <Text style={[styles.modalTitle, { color: text }]} numberOfLines={2}>
                  {headline}
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.closeBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
              onPress={onClose}
              hitSlop={8}
            >
              <Text style={[styles.closeBtnText, { color: muted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {isEditing ? (
              <TextInput
                style={[styles.contentInput, { color: text, backgroundColor: inputBg, borderColor: border }]}
                value={editContent}
                onChangeText={setEditContent}
                placeholder="Start writing..."
                placeholderTextColor={placeholderColor}
                multiline
                textAlignVertical="top"
                returnKeyType="done"
              />
            ) : (
              <Pressable onPress={handleTapToEdit} style={styles.contentPressable}>
                <View style={styles.contentRow}>
                  <Text style={[styles.contentText, { color: muted }]}>{content}</Text>
                  <Pressable
                    style={[
                      styles.copyIcon,
                      { backgroundColor: copySuccess ? "rgba(46,204,113,0.2)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" },
                    ]}
                    onPress={handleCopy}
                    hitSlop={8}
                  >
                    <Text style={[styles.copyIconText, { color: copySuccess ? "#2ecc71" : muted }]}>
                      {copySuccess ? "\u2714" : "\uD83D\uDCCB"}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            )}
          </ScrollView>

          {isEditing && (
            <View style={[styles.editActions, { borderTopColor: border, backgroundColor: bg }]}>
              <Pressable style={[styles.editBtn, { borderColor: border, borderWidth: 1 }]} onPress={handleCancelEdit}>
                <Text style={[styles.editBtnText, { color: text }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.editBtn, { backgroundColor: Colors.accent }]} onPress={handleSaveEdit}>
                <Text style={[styles.editBtnText, { color: "#fff" }]}>Save</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 520,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    maxHeight: "92%",
    overflow: "hidden",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  headlinePressable: {
    flex: 1,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    lineHeight: 28,
  },
  headlineInput: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: "800",
    lineHeight: 28,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    minHeight: 200,
  },
  contentPressable: {
    paddingTop: Spacing.xs,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  contentText: {
    flex: 1,
    fontSize: FontSize.md,
    lineHeight: 24,
  },
  copyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  copyIconText: {
    fontSize: 15,
    fontWeight: "700",
  },
  contentInput: {
    fontSize: FontSize.md,
    lineHeight: 24,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 260,
    textAlignVertical: "top",
    paddingTop: Spacing.sm,
  },
  editActions: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  editBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  editBtnText: {
    fontSize: FontSize.md,
    fontWeight: "700",
  },
});
