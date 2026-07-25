import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
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

  const handleDelete = useCallback(() => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete this entry?")) {
        onDelete(entryId);
        onClose();
      }
      return;
    }
    Alert.alert("Delete Entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          onDelete(entryId);
          onClose();
        },
      },
    ]);
  }, [entryId, onDelete, onClose]);

  const handleSaveEdit = useCallback(() => {
    if (!editHeadline.trim() || !editContent.trim()) return;
    Keyboard.dismiss();
    onEdit(entryId, editHeadline.trim(), editContent.trim());
    setIsEditing(false);
  }, [entryId, editHeadline, editContent, onEdit]);

  const handleContentTap = useCallback(() => {
    if (!isEditing) {
      setIsEditing(true);
    }
  }, [isEditing]);

  const bg = isDark ? Colors.dark.bg : Colors.light.card;
  const text = isDark ? Colors.dark.text : Colors.light.text;
  const muted = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.light.border;
  const inputBg = isDark ? Colors.dark.card : "#f0f0f0";
  const placeholderColor = isDark ? Colors.dark.textMuted : Colors.light.textMuted;

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.container, { backgroundColor: bg, borderTopColor: border }]}>
          <View style={styles.handle} />

          <View style={styles.topBar}>
            <Pressable
              style={[styles.modeToggle, { backgroundColor: isEditing ? "rgba(108,99,255,0.2)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", borderColor: border }]}
              onPress={() => setIsEditing((prev) => !prev)}
            >
              <Text style={[styles.modeToggleText, { color: isEditing ? Colors.accent : muted }]}>
                {isEditing ? "Preview" : "Edit"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.copyIconBtn, { backgroundColor: copySuccess ? "rgba(46,204,113,0.2)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
              onPress={handleCopy}
              hitSlop={8}
            >
              <Text style={[styles.copyIconText, { color: copySuccess ? "#2ecc71" : muted }]}>
                {copySuccess ? "\u2714" : "\u2398"}
              </Text>
            </Pressable>
            <Pressable style={[styles.closeIconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} onPress={onClose} hitSlop={8}>
              <Text style={[styles.closeIconText, { color: muted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {isEditing ? (
              <View>
                <TextInput
                  style={[styles.editInput, { backgroundColor: inputBg, color: text, borderColor: border }]}
                  value={editHeadline}
                  onChangeText={setEditHeadline}
                  placeholder="Headline"
                  placeholderTextColor={placeholderColor}
                  maxLength={100}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
                <TextInput
                  style={[styles.editContentInput, { backgroundColor: inputBg, color: text, borderColor: border }]}
                  value={editContent}
                  onChangeText={setEditContent}
                  placeholder="Content"
                  placeholderTextColor={placeholderColor}
                  multiline
                  textAlignVertical="top"
                  returnKeyType="done"
                />
              </View>
            ) : (
              <Pressable onPress={handleContentTap}>
                <Text style={[styles.headline, { color: text }]}>{headline}</Text>
                <Text style={[styles.contentText, { color: muted }]}>{content}</Text>
                <Text style={[styles.tapHint, { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }]}>
                  Tap to edit
                </Text>
              </Pressable>
            )}
          </ScrollView>

          {isEditing && (
            <View style={[styles.editActions, { borderTopColor: border, backgroundColor: bg }]}>
              <Pressable
                style={[styles.cancelEditBtn, { borderColor: border }]}
                onPress={() => {
                  Keyboard.dismiss();
                  setEditHeadline(headline);
                  setEditContent(content);
                  setIsEditing(false);
                }}
              >
                <Text style={[styles.cancelEditText, { color: text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveEditBtn, { backgroundColor: Colors.accent }]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveEditText}>Save</Text>
              </Pressable>
            </View>
          )}

          {!isEditing && (
            <View style={styles.actions}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "rgba(255, 59, 48, 0.15)" }]}
                onPress={handleDelete}
              >
                <Text style={[styles.actionBtnText, { color: "#FF3B30" }]}>Delete</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: Colors.accent }]}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.actionBtnText}>Edit</Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "85%",
    borderTopWidth: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#444",
    alignSelf: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  modeToggle: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  modeToggleText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  copyIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  copyIconText: {
    fontSize: 16,
    fontWeight: "700",
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIconText: {
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    maxHeight: "55%",
  },
  headline: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    marginBottom: Spacing.md,
  },
  contentText: {
    fontSize: FontSize.md,
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  tapHint: {
    fontSize: FontSize.xs,
    fontStyle: "italic",
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  editInput: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.xxl,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  editContentInput: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    lineHeight: 24,
    minHeight: 180,
    textAlignVertical: "top",
    paddingTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  editActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  cancelEditBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  cancelEditText: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  saveEditBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  saveEditText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: "700",
  },
});
