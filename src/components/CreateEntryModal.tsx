import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
} from "react-native";
import { Colors, BorderRadius, Spacing, FontSize } from "../constants/theme";

interface CreateEntryModalProps {
  isVisible: boolean;
  isDark: boolean;
  editData?: { id: string; headline: string; content: string } | null;
  onClose: () => void;
  onSave: (headline: string, content: string) => void;
  onEditSave: (id: string, headline: string, content: string) => void;
}

export default function CreateEntryModal({
  isVisible,
  isDark,
  editData,
  onClose,
  onSave,
  onEditSave,
}: CreateEntryModalProps) {
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (editData) {
      setHeadline(editData.headline);
      setContent(editData.content);
    } else {
      setHeadline("");
      setContent("");
    }
  }, [editData, isVisible]);

  const handleSave = () => {
    if (!headline.trim() || !content.trim()) return;
    Keyboard.dismiss();

    if (editData) {
      onEditSave(editData.id, headline.trim(), content.trim());
    } else {
      onSave(headline.trim(), content.trim());
    }

    setHeadline("");
    setContent("");
    onClose();
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const bgColor = isDark ? Colors.dark.bg : Colors.light.card;
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const mutedColor = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
  const borderColor = isDark ? Colors.dark.border : Colors.light.border;
  const inputBg = isDark ? Colors.dark.card : "#f0f0f0";
  const placeholderColor = isDark ? Colors.dark.textMuted : Colors.light.textMuted;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
          <View style={[styles.headerRow, { borderBottomColor: borderColor }]}>
            <Text style={[styles.title, { color: textColor }]}>
              {editData ? "Edit Entry" : "New Entry"}
            </Text>
            <Pressable style={[styles.closeBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} onPress={handleClose}>
              <Text style={[styles.closeBtnText, { color: mutedColor }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollBodyContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Text style={[styles.label, { color: mutedColor }]}>Headline</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
              placeholder="e.g., My Social Media Links"
              placeholderTextColor={placeholderColor}
              value={headline}
              onChangeText={setHeadline}
              maxLength={100}
              returnKeyType="next"
              blurOnSubmit={false}
            />

            <Text style={[styles.label, { color: mutedColor }]}>Content</Text>
            <TextInput
              style={[styles.input, styles.contentInput, { backgroundColor: inputBg, color: textColor, borderColor }]}
              placeholder="Paste or type your content here..."
              placeholderTextColor={placeholderColor}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={handleSave}
            />
          </ScrollView>

          <View style={[styles.actions, { borderTopColor: borderColor, backgroundColor: bgColor }]}>
            <Pressable
              style={[styles.cancelBtn, { borderColor }]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelBtnText, { color: textColor }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.saveBtn,
                {
                  backgroundColor:
                    headline.trim() && content.trim()
                      ? Colors.accent
                      : isDark
                      ? Colors.dark.border
                      : Colors.light.border,
                },
              ]}
              onPress={handleSave}
              disabled={!headline.trim() || !content.trim()}
            >
              <Text style={styles.saveBtnText}>{editData ? "Update" : "Save"}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    width: "100%",
    maxWidth: 420,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    maxHeight: "88%",
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  scrollBody: {
    flexGrow: 0,
  },
  scrollBodyContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    marginBottom: Spacing.md,
  },
  contentInput: {
    minHeight: 180,
    textAlignVertical: "top",
    paddingTop: Spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  cancelBtnText: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: "700",
  },
});
