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
  const contentRef = useRef<TextInput>(null);

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

  const bgColor = isDark ? Colors.dark.bg : Colors.light.card;
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const mutedColor = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
  const borderColor = isDark ? Colors.dark.border : Colors.light.border;
  const inputBg = isDark ? Colors.dark.card : "#f0f0f0";
  const placeholderColor = isDark ? Colors.dark.textMuted : Colors.light.textMuted;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
          <View style={styles.body}>
            <Text style={[styles.title, { color: textColor }]}>
              {editData ? "Edit Entry" : "New Entry"}
            </Text>

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
              onSubmitEditing={() => contentRef.current?.focus()}
            />

            <Text style={[styles.label, { color: mutedColor }]}>Content</Text>
            <TextInput
              ref={contentRef}
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
          </View>

          <View style={[styles.actions, { borderTopColor: borderColor }]}>
            <Pressable
              style={[styles.cancelBtn, { borderColor }]}
              onPress={() => { Keyboard.dismiss(); onClose(); }}
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
    maxHeight: "85%",
    overflow: "hidden",
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    marginBottom: Spacing.lg,
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
    minHeight: 200,
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
