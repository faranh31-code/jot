import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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

    if (editData) {
      onEditSave(editData.id, headline.trim(), content.trim());
    } else {
      onSave(headline.trim(), content.trim());
    }

    setHeadline("");
    setContent("");
    onClose();
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? Colors.dark.bg : Colors.light.card,
              borderTopColor: isDark ? Colors.dark.border : Colors.light.border,
            },
          ]}
        >
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text
              style={[styles.title, { color: isDark ? Colors.dark.text : Colors.light.text }]}
            >
              {editData ? "Edit Entry" : "New Entry"}
            </Text>

            <Text
              style={[
                styles.label,
                { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary },
              ]}
            >
              Headline
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.headlineInput,
                {
                  backgroundColor: isDark ? Colors.dark.card : "#f0f0f0",
                  color: isDark ? Colors.dark.text : Colors.light.text,
                  borderColor: isDark ? Colors.dark.border : Colors.light.border,
                },
              ]}
              placeholder="e.g., My Social Media Links"
              placeholderTextColor={isDark ? Colors.dark.textMuted : Colors.light.textMuted}
              value={headline}
              onChangeText={setHeadline}
              maxLength={100}
            />

            <Text
              style={[
                styles.label,
                { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary },
              ]}
            >
              Content
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.contentInput,
                {
                  backgroundColor: isDark ? Colors.dark.card : "#f0f0f0",
                  color: isDark ? Colors.dark.text : Colors.light.text,
                  borderColor: isDark ? Colors.dark.border : Colors.light.border,
                },
              ]}
              placeholder="Paste or type your content here..."
              placeholderTextColor={isDark ? Colors.dark.textMuted : Colors.light.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.actions}>
              <Pressable
                style={[
                  styles.cancelBtn,
                  {
                    backgroundColor: "transparent",
                    borderWidth: 1,
                    borderColor: isDark ? Colors.dark.border : Colors.light.border,
                  },
                ]}
                onPress={onClose}
              >
                <Text
                  style={[
                    styles.cancelBtnText,
                    { color: isDark ? Colors.dark.text : Colors.light.text },
                  ]}
                >
                  Cancel
                </Text>
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
          </ScrollView>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#444",
    alignSelf: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
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
  headlineInput: {
    height: 48,
  },
  contentInput: {
    minHeight: 200,
    textAlignVertical: "top",
    paddingTop: Spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
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
