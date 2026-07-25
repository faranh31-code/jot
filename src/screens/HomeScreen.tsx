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
  onOpenPaywall: () => void;
}

export default function HomeScreen({ isDark, onOpenPaywall }: HomeScreenProps) {
  const { entries, isLoading, createEntry, editEntry, removeEntry } = useEntries();
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

  const handleEntryPress = useCallback(
    (entry: { id: string; headline: string; content: string }) => {
      setSelectedEntry(entry);
      setDetailVisible(true);
    },
    []
  );

  const handleEdit = useCallback(
    (id: string, headline: string, content: string) => {
      setDetailVisible(false);
      setEditData({ id, headline, content });
      setTimeout(() => setCreateVisible(true), 300);
    },
    []
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await removeEntry(id);
    },
    [removeEntry]
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
      await createEntry(headline, content);
    },
    [createEntry]
  );

  const handleEditSave = useCallback(
    async (id: string, headline: string, content: string) => {
      await editEntry(id, headline, content);
      setEditData(null);
    },
    [editEntry]
  );

  const handleCreatePress = useCallback(() => {
    setEditData(null);
    setCreateVisible(true);
  }, []);

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
      <View style={styles.header}>
        <Text
          style={[styles.headerTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}
        >
          Text Saver
        </Text>
        <Text
          style={[
            styles.headerSubtitle,
            { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary },
          ]}
        >
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </Text>
      </View>

      {entries.length === 0 ? (
        <EmptyState isDark={isDark} />
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.hero,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
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
