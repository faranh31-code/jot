import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Colors, BorderRadius, Spacing, FontSize } from "../constants/theme";
import EntryCard from "../components/EntryCard";
import EntryDetailModal from "../components/EntryDetailModal";
import CreateEntryModal from "../components/CreateEntryModal";
import EmptyState from "../components/EmptyState";
import { useEntries } from "../hooks/useEntries";
import { useShare } from "../hooks/useShare";

interface HomeScreenProps {
  isDark: boolean;
  isUserLoggedIn: boolean;
  onRequireAuth: () => void;
}

export default function HomeScreen({ isDark, isUserLoggedIn, onRequireAuth }: HomeScreenProps) {
  const { entries, isLoading, createEntry, editEntry, removeEntry } = useEntries(isUserLoggedIn);
  const { copyToClipboard } = useShare();

  const [selectedEntry, setSelectedEntry] = useState<{
    id: string;
    headline: string;
    content: string;
  } | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [editData, setEditData] = useState<{
    id: string;
    headline: string;
    content: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const handleEntryPress = useCallback(
    (entry: { id: string; headline: string; content: string }) => {
      setSelectedEntry(entry);
      setDetailVisible(true);
    },
    []
  );

  const handleEdit = useCallback(
    (id: string, headline: string, content: string) => {
      if (!isUserLoggedIn) {
        onRequireAuth();
        return;
      }
      setDetailVisible(false);
      setEditData({ id, headline, content });
      setTimeout(() => setCreateVisible(true), 300);
    },
    [isUserLoggedIn, onRequireAuth]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!isUserLoggedIn) {
        onRequireAuth();
        return;
      }
      await removeEntry(id);
    },
    [removeEntry, isUserLoggedIn, onRequireAuth]
  );

  const handleCopy = useCallback(
    async (text: string) => {
      const success = await copyToClipboard(text);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    },
    [copyToClipboard]
  );

  const handleSave = useCallback(
    async (headline: string, content: string) => {
      if (!isUserLoggedIn) {
        onRequireAuth();
        return;
      }
      await createEntry(headline, content);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    },
    [createEntry, isUserLoggedIn, onRequireAuth]
  );

  const handleEditSave = useCallback(
    async (id: string, headline: string, content: string) => {
      if (!isUserLoggedIn) {
        onRequireAuth();
        return;
      }
      await editEntry(id, headline, content);
      setEditData(null);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    },
    [editEntry, isUserLoggedIn, onRequireAuth]
  );

  const handleCreatePress = useCallback(() => {
    if (!isUserLoggedIn) {
      onRequireAuth();
      return;
    }
    setEditData(null);
    setCreateVisible(true);
  }, [isUserLoggedIn, onRequireAuth]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg },
        ]}
      >
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
      <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg }]}>
      {entries.length === 0 && isUserLoggedIn ? (
        <EmptyState isDark={isDark} />
      ) : entries.length === 0 && !isUserLoggedIn ? (
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeIcon}>{"\uD83D\uDCDD"}</Text>
          <Text style={[styles.welcomeTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            Save anything, anytime
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
            Create your first entry by tapping the + button below
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EntryCard
              headline={item.headline}
              content={item.content}
              createdAt={item.createdAt}
              isDark={isDark}
              onPress={() => handleEntryPress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Pressable style={styles.fab} onPress={handleCreatePress}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <EntryDetailModal
        isVisible={detailVisible}
        headline={selectedEntry?.headline || ""}
        content={selectedEntry?.content || ""}
        entryId={selectedEntry?.id || ""}
        isDark={isDark}
        onClose={() => setDetailVisible(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCopy={handleCopy}
      />

      <CreateEntryModal
        isVisible={createVisible}
        isDark={isDark}
        editData={editData}
        onClose={() => {
          setCreateVisible(false);
          setEditData(null);
        }}
        onSave={handleSave}
        onEditSave={handleEditSave}
      />

      {copied && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Copied to clipboard!</Text>
        </View>
      )}

      {savedToast && (
        <View style={[styles.toast, { backgroundColor: "#2ecc71" }]}>
          <Text style={styles.toastText}>{"\u2714"} Your entry has been saved successfully</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  welcomeIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  welcomeTitle: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "300",
    marginTop: -2,
  },
  toast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  toastText: {
    color: "#fff",
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
});
