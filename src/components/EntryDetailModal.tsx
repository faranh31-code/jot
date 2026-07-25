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

  const bg = isDark ? Colors.dark.bg : Colors.light.card;
  const text = isDark ? Colors.dark.text : Colors.light.text;
  const muted = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.light.border;
  const inputBg = isDark ? Colors.dark.card : "#f0f0f0";
  const placeholderColor = isDark ? Colors.dark.textMuted : Colors.light.textMuted;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: bg, borderColor: border }]} onStartShouldSetResponder={() => true}>
          <View style={styles.topBar}>
            <Text style={[styles.modalTitle, { color: text }]} numberOfLines={1}>{headline}</Text>
            <View style={styles.topActions}>
              <Pressable
                style={[styles.iconBtn, { backgroundColor: copySuccess ? "rgba(46,204,113,0.2)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
                onPress={handleCopy}
                hitSlop={8}
              >
                <Text style={[styles.iconBtnText, { color: copySuccess ? "#2ecc71" : muted }]}>
                  {copySuccess ? "\u2714" : "\uD83D\uDCCB"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.iconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
                onPress={onClose}
                hitSlop={8}
              >
                <Text style={[styles.iconBtnText, { color: muted }]}>✕</Text>
              </Pressable>
            </View>
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
              <Text style={[styles.contentText, { color: muted }]}>{content}</Text>
            )}
          </ScrollView>

          <View style={[styles.actions, { borderTopColor: border, backgroundColor: bg }]}>
            {isEditing ? (
              <>
                <Pressable
                  style={[styles.actionBtn, { borderColor: border, borderWidth: 1 }]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setEditHeadline(headline);
                    setEditContent(content);
                    setIsEditing(false);
                  }}
                >
                  <Text style={[styles.actionBtnText, { color: text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: Colors.accent }]}
                  onPress={handleSaveEdit}
                >
                  <Text style={[styles.actionBtnText, { color: "#fff" }]}>Save</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: "rgba(255,59,48,0.15)" }]}
                  onPress={handleDelete}
                >
                  <Text style={[styles.actionBtnText, { color: "#FF3B30" }]}>Delete</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: Colors.accent }]}
                  onPress={() => setIsEditing(true)}
                >
                  <Text style={[styles.actionBtnText, { color: "#fff" }]}>Edit</Text>
                </Pressable>
              </>
            )}
          </View>
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
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    maxHeight: "80%",
    overflow: "hidden",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    flex: 1,
    marginRight: Spacing.sm,
  },
  topActions: {
    flexDirection: "row",
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    maxHeight: "55%",
  },
  contentText: {
    fontSize: FontSize.md,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  editInput: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.lg,
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
    minHeight: 160,
    textAlignVertical: "top",
    paddingTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: FontSize.md,
    fontWeight: "700",
  },
});
