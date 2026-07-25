import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  Platform,
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
  const handleCopy = useCallback(() => {
    onCopy(content);
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

  const handleEdit = useCallback(() => {
    onEdit(entryId, headline, content);
  }, [entryId, headline, content, onEdit]);

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
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
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text
              style={[styles.headline, { color: isDark ? Colors.dark.text : Colors.light.text }]}
            >
              {headline}
            </Text>
            <Text
              style={[
                styles.content,
                { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary },
              ]}
            >
              {content}
            </Text>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: Colors.accent }]}
              onPress={handleCopy}
            >
              <Text style={styles.actionBtnText}>Copy</Text>
            </Pressable>
            <Pressable
              style={[
                styles.actionBtn,
                {
                  backgroundColor: "transparent",
                  borderWidth: 1,
                  borderColor: isDark ? Colors.dark.border : Colors.light.border,
                },
              ]}
              onPress={handleEdit}
            >
              <Text
                style={[
                  styles.actionBtnText,
                  { color: isDark ? Colors.dark.text : Colors.light.text },
                ]}
              >
                Edit
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: "rgba(255, 59, 48, 0.15)" }]}
              onPress={handleDelete}
            >
              <Text style={[styles.actionBtnText, { color: "#FF3B30" }]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
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
    maxHeight: "80%",
    borderTopWidth: 1,
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    maxHeight: "60%",
  },
  headline: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    marginBottom: Spacing.md,
  },
  content: {
    fontSize: FontSize.md,
    lineHeight: 24,
    marginBottom: Spacing.lg,
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
