import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  TextInput,
} from "react-native";
import { Colors, BorderRadius, Spacing, FontSize } from "../constants/theme";
import EntryCard from "../components/EntryCard";
import EntryDetailModal from "../components/EntryDetailModal";
import CreateEntryModal from "../components/CreateEntryModal";
import EmptyState from "../components/EmptyState";
import { useEntries } from "../hooks/useEntries";
import { useShare } from "../hooks/useShare";

const FREE_ENTRY_LIMIT = 10;

type SortOption = "newest" | "oldest" | "az" | "za";

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "az", label: "A \u2192 Z" },
  { key: "za", label: "Z \u2192 A" },
];

interface HomeScreenProps {
  isDark: boolean;
  uid: string | null;
  isPro: boolean;
  onRequireAuth: () => void;
  onRequirePro?: () => void;
  onCopyFromPreview?: () => void;
}

export default function HomeScreen({ isDark, uid, isPro, onRequireAuth, onRequirePro, onCopyFromPreview }: HomeScreenProps) {
  const { entries, isLoading, createEntry, editEntry, removeEntry, refreshEntries } = useEntries(uid);
  const { copyToClipboard } = useShare();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

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
  const [deleteToast, setDeleteToast] = useState(false);
  const [limitToast, setLimitToast] = useState(false);

  const filteredAndSorted = useMemo(() => {
    let result = entries;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.headline.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q)
      );
    }
    switch (sortOption) {
      case "newest":
        result = [...result].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      case "oldest":
        result = [...result].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        break;
      case "az":
        result = [...result].sort((a, b) => a.headline.localeCompare(b.headline));
        break;
      case "za":
        result = [...result].sort((a, b) => b.headline.localeCompare(a.headline));
        break;
    }
    return result;
  }, [entries, searchQuery, sortOption]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshEntries();
    setRefreshing(false);
  }, [refreshEntries]);

  const confirmDelete = useCallback(
    (id: string) => {
      if (Platform.OS === "web") {
        if (window.confirm("Are you sure you want to delete this entry?")) {
          removeEntry(id);
          setDeleteToast(true);
          setTimeout(() => setDeleteToast(false), 2500);
        }
        return;
      }
      Alert.alert("Delete Entry", "Are you sure you want to delete this entry?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await removeEntry(id);
            setDeleteToast(true);
            setTimeout(() => setDeleteToast(false), 2500);
          },
        },
      ]);
    },
    [removeEntry]
  );

  const handleEntryPress = useCallback(
    (entry: { id: string; headline: string; content: string }) => {
      setSelectedEntry(entry);
      setDetailVisible(true);
    },
    []
  );

  const handleEdit = useCallback(
    (id: string, headline: string, content: string) => {
      if (!uid) {
        onRequireAuth();
        return;
      }
      setDetailVisible(false);
      setEditData({ id, headline, content });
      setTimeout(() => setCreateVisible(true), 300);
    },
    [uid, onRequireAuth]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!uid) {
        onRequireAuth();
        return;
      }
      await removeEntry(id);
    },
    [removeEntry, uid, onRequireAuth]
  );

  const handleCopy = useCallback(
    async (text: string) => {
      const success = await copyToClipboard(text);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        if (onCopyFromPreview) onCopyFromPreview();
      }
    },
    [copyToClipboard, onCopyFromPreview]
  );

  const handleSave = useCallback(
    async (headline: string, content: string) => {
      if (!uid) {
        onRequireAuth();
        return;
      }
      if (!isPro && entries.length >= FREE_ENTRY_LIMIT) {
        setLimitToast(true);
        setTimeout(() => setLimitToast(false), 3000);
        return;
      }
      await createEntry(headline, content);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    },
    [createEntry, uid, isPro, entries.length, onRequireAuth]
  );

  const handleEditSave = useCallback(
    async (id: string, headline: string, content: string) => {
      if (!uid) {
        onRequireAuth();
        return;
      }
      await editEntry(id, headline, content);
      setEditData(null);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    },
    [editEntry, uid, onRequireAuth]
  );

  const handleCreatePress = useCallback(() => {
    if (!uid) {
      onRequireAuth();
      return;
    }
    if (!isPro && entries.length >= FREE_ENTRY_LIMIT) {
      if (onRequirePro) onRequirePro();
      return;
    }
    setEditData(null);
    setCreateVisible(true);
  }, [uid, isPro, entries.length, onRequireAuth, onRequirePro]);

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

  const renderHeader = () => {
    if (entries.length === 0) return null;
    return (
      <View style={styles.toolbarContainer}>
        <View style={[styles.searchRow, { backgroundColor: isDark ? Colors.dark.card : "#f0f0f0", borderColor: isDark ? Colors.dark.border : Colors.light.border }]}>
          <Text style={styles.searchIcon}>{"\uD83D\uDD0D"}</Text>
          <TextInput
            style={[styles.searchInput, { color: isDark ? Colors.dark.text : Colors.light.text }]}
            placeholder="Search entries..."
            placeholderTextColor={isDark ? Colors.dark.textMuted : Colors.light.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={6}>
              <Text style={[styles.clearSearch, { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }]}>✕</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.sortRow}>
          <Pressable
            style={[
              styles.sortToggle,
              {
                backgroundColor: isDark ? Colors.dark.card : "#f0f0f0",
                borderColor: isDark ? Colors.dark.border : Colors.light.border,
              },
            ]}
            onPress={() => setSortMenuVisible(!sortMenuVisible)}
          >
            <Text style={[styles.sortToggleText, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
              {"\u21C5"} Sort
            </Text>
          </Pressable>
          {sortMenuVisible && (
            <View style={[styles.sortMenu, { backgroundColor: isDark ? Colors.dark.card : "#fff", borderColor: isDark ? Colors.dark.border : Colors.light.border }]}>
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.sortMenuItem,
                    sortOption === opt.key && { backgroundColor: Colors.accentLight },
                  ]}
                  onPress={() => {
                    setSortOption(opt.key);
                    setSortMenuVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortMenuText,
                      {
                        color: sortOption === opt.key ? Colors.accent : isDark ? Colors.dark.text : Colors.light.text,
                        fontWeight: sortOption === opt.key ? "700" : "500",
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg }]}>
      {entries.length === 0 && !!uid ? (
        <EmptyState isDark={isDark} />
      ) : entries.length === 0 && !uid ? (
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
          data={filteredAndSorted}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            searchQuery ? (
              <View style={styles.emptySearchContainer}>
                <Text style={[styles.emptySearchText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
                  No entries match "{searchQuery}"
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <EntryCard
              headline={item.headline}
              content={item.content}
              createdAt={item.createdAt}
              isDark={isDark}
              onPress={() => handleEntryPress(item)}
              onDelete={() => confirmDelete(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
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
          <Text style={styles.toastText}>{"\u2714"} Content copied to clipboard!</Text>
        </View>
      )}

      {savedToast && (
        <View style={[styles.toast, { backgroundColor: "#2ecc71" }]}>
          <Text style={styles.toastText}>{"\u2714"} Your entry has been saved successfully</Text>
        </View>
      )}

      {deleteToast && (
        <View style={[styles.toast, { backgroundColor: "#e74c3c" }]}>
          <Text style={styles.toastText}>Entry deleted</Text>
        </View>
      )}

      {limitToast && (
        <View style={[styles.toast, { backgroundColor: "#FF9500" }]}>
          <Text style={styles.toastText}>Free limit reached. Upgrade to Pro for unlimited entries.</Text>
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
  toolbarContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
  },
  searchIcon: {
    fontSize: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
  },
  clearSearch: {
    fontSize: 14,
    fontWeight: "700",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  sortToggle: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  sortToggleText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  sortMenu: {
    position: "absolute",
    top: 40,
    left: 0,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 160,
    zIndex: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    overflow: "hidden",
  },
  sortMenuItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  sortMenuText: {
    fontSize: FontSize.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  emptySearchContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptySearchText: {
    fontSize: FontSize.md,
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
