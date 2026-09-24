import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView,
  Animated,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, BorderRadius, Spacing, FontSize, Shadow, FontFamily } from "../constants/theme";
import { useJot } from "../hooks/useJot";
import { useShare } from "../hooks/useShare";
import { useInterstitialAd } from "../hooks/useInterstitialAd";
import { useRewardedAd } from "../hooks/useRewardedAd";
import { Jot, JotCategory, FREE_JOT_LIMIT, StickyNoteColor, STICKY_NOTE_COLORS, DEFAULT_NOTE_COLOR } from "../types";
import { isPro as checkIsPro, canCreateJot } from "../services/subscription";
import { trackEvent, trackFirstCopy, trackFirstShare } from "../services/analytics";
import JotCard from "../components/JotCard";
import StickyNoteCard from "../components/StickyNoteCard";
import JotEditor from "../components/JotEditor";
import ShareCard from "../components/ShareCard";
import CollaborationModal from "../components/CollaborationModal";
import AdInlineBanner from "../components/AdInlineBanner";
import AdNative from "../components/AdNative";

type NoteFilter = "all" | "notes" | "sticky";

const TYPE_OPTIONS: { key: NoteFilter; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "layers-outline" },
  { key: "sticky", label: "Sticky Notes", icon: "albums-outline" },
  { key: "notes", label: "Simple Notes", icon: "document-text-outline" },
];

const CATEGORY_OPTIONS: { key: JotCategory | null; label: string; icon: string }[] = [
  { key: null, label: "All", icon: "apps-outline" },
  { key: "personal", label: "Personal Work", icon: "person-outline" },
  { key: "work", label: "Work", icon: "briefcase-outline" },
  { key: "ideas", label: "Ideas", icon: "bulb-outline" },
  { key: "study", label: "Study", icon: "school-outline" },
  { key: "shopping", label: "Shopping", icon: "cart-outline" },
  { key: "quotes", label: "Quotes", icon: "chatbubble-outline" },
  { key: "other", label: "Other", icon: "ellipsis-horizontal-outline" },
];

type SortOption = "newest" | "oldest" | "az" | "za" | "recently_updated" | "pinned_first";

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "az", label: "A \u2192 Z" },
  { key: "za", label: "Z \u2192 A" },
  { key: "recently_updated", label: "Recently updated" },
  { key: "pinned_first", label: "Pinned first" },
];

interface HomeScreenProps {
  isDark: boolean;
  uid: string | null;
  isAnonymous: boolean;
  onRequireAuth: () => void;
  onOpenPaywall: (trigger?: string) => void;
  sharedText?: string | null;
  onSharedTextConsumed?: () => void;
}

const EXAMPLE_JOTS: { headline: string; body: string; category: JotCategory }[] = [
  { headline: "Wi-Fi password", body: "Network: Home_5G\nPassword: MyP@ssw0rd", category: "personal" },
  { headline: "Business idea", body: "App that sends you a reminder every time you think of something but forgot to write it down", category: "ideas" },
  { headline: "Things to buy", body: "- Coffee beans\n- Notebook\n- USB-C cable\n- New headphones", category: "shopping" },
  { headline: "Quote I want to remember", body: "The best time to plant a tree was 20 years ago. The second best time is now.", category: "quotes" },
];

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function HomeScreen({
  isDark,
  uid,
  isAnonymous,
  onRequireAuth,
  onOpenPaywall,
  sharedText,
  onSharedTextConsumed,
}: HomeScreenProps) {
  const {
    jots,
    filteredJots,
    isLoading,
    createJot,
    editJot,
    deleteJot,
    togglePin,
    refreshJots,
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    selectedCategory,
    setSelectedCategory,
    jotCount,
  } = useJot();

  const { copyToClipboard, shareText } = useShare();
  const { showNow: showInterstitialNow, maybeShowAfterAction } = useInterstitialAd();
  const { isReady: isRewardedReady, show: showRewardedAd } = useRewardedAd();

  const [refreshing, setRefreshing] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("all");
  const [editingJot, setEditingJot] = useState<Jot | null>(null);
  const [shareJot, setShareJot] = useState<Jot | null>(null);
  const [inviteJot, setInviteJot] = useState<Jot | null>(null);
  const [confirmDeleteJot, setConfirmDeleteJot] = useState<Jot | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"saved" | "deleted" | "copied">("saved");
  const [undoDelete, setUndoDelete] = useState<{ jot: Jot; timeout: ReturnType<typeof setTimeout> } | null>(null);
  const [initialSharedBody, setInitialSharedBody] = useState<string | null>(null);
  const [rewardedBonusRemaining, setRewardedBonusRemaining] = useState(0);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (sharedText && sharedText.trim().length > 0) {
      if (!uid || isAnonymous) {
        onRequireAuth();
        onSharedTextConsumed?.();
        return;
      }
      if (!canCreateJot(jotCount)) {
        onOpenPaywall("limit");
        onSharedTextConsumed?.();
        return;
      }
      setInitialSharedBody(sharedText.trim());
      setEditingJot(null);
      setEditorVisible(true);
      onSharedTextConsumed?.();
    }
  }, [sharedText]);

  useEffect(() => {
    if (toastMessage) {
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setToastMessage(null));
    }
  }, [toastMessage, toastAnim]);

  const showToast = useCallback((msg: string, type: "saved" | "deleted" | "copied") => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToastType(type);
    setToastMessage(msg);
  }, []);

  const pinnedJots = useMemo(() => filteredJots.filter((j) => j.isPinned), [filteredJots]);
  const unpinnedJots = useMemo(() => filteredJots.filter((j) => !j.isPinned), [filteredJots]);
  const wallJots = useMemo(() => unpinnedJots.filter((j) => !!j.isNote), [unpinnedJots]);
  const regularJots = useMemo(() => unpinnedJots.filter((j) => !j.isNote), [unpinnedJots]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshJots();
    setRefreshing(false);
  }, [refreshJots]);

  const handleCreateJot = useCallback(() => {
    if (!uid || isAnonymous) {
      onRequireAuth();
      return;
    }
    if (!canCreateJot(jotCount) && rewardedBonusRemaining <= 0) {
      Alert.alert(
        "Limit Reached",
        `You've reached the ${FREE_JOT_LIMIT} Nota limit. Upgrade to Pro for unlimited, or watch a short ad to save one more.`,
        [
          { text: "Maybe Later", style: "cancel" },
          { text: "Upgrade to Pro", onPress: () => onOpenPaywall("limit") },
          ...(isRewardedReady
            ? [
                {
                  text: "Watch Ad",
                  onPress: () => {
                    showRewardedAd({
                      onEarned: () => {
                        setRewardedBonusRemaining((prev) => prev + 1);
                        setEditingJot(null);
                        setEditorVisible(true);
                      },
                    });
                  },
                },
              ]
            : []),
        ]
      );
      return;
    }
    setEditingJot(null);
    setEditorVisible(true);
  }, [uid, isAnonymous, jotCount, rewardedBonusRemaining, isRewardedReady, onRequireAuth, onOpenPaywall, showRewardedAd]);

  const handleEditJot = useCallback(
    (jot: Jot) => {
      if (!uid || isAnonymous) {
        onRequireAuth();
        return;
      }
      setEditingJot(jot);
      setEditorVisible(true);
    },
    [uid, isAnonymous, onRequireAuth]
  );

  const handleEditorSave = useCallback(
    async (
      headline: string,
      body: string,
      tags: string[],
      category: JotCategory,
      isNote: boolean,
      noteColor: StickyNoteColor
    ) => {
      if (!uid || isAnonymous) {
        onRequireAuth();
        return;
      }
      if (editingJot) {
        await editJot(editingJot.id, { headline, body, tags, category, isNote, noteColor });
        showToast("Saved", "saved");
      } else {
        if (!canCreateJot(jotCount) && rewardedBonusRemaining <= 0) {
          onOpenPaywall("limit");
          return;
        }
        if (!canCreateJot(jotCount) && rewardedBonusRemaining > 0) {
          setRewardedBonusRemaining((prev) => prev - 1);
        }
        await createJot(body, { headline, tags, category, isNote, noteColor });
        showToast("Saved", "saved");
      }
      setEditorVisible(false);
      setEditingJot(null);
      setInitialSharedBody(null);
      if (!checkIsPro()) {
        setTimeout(() => maybeShowAfterAction(), 600);
      }
    },
    [
      editingJot, uid, isAnonymous, jotCount, rewardedBonusRemaining, onRequireAuth, onOpenPaywall,
      editJot, createJot, showToast, maybeShowAfterAction,
    ]
  );

  const handleCopy = useCallback(
    async (jot: Jot) => {
      const text = jot.headline ? `${jot.headline}\n\n${jot.body}` : jot.body;
      const brandedText = checkIsPro() ? text : `${text}\n\n— Made with Nota`;
      const success = await copyToClipboard(brandedText);
      if (success) {
        showToast("Copied", "copied");
        await trackFirstCopy();
        if (!checkIsPro()) {
          setTimeout(() => maybeShowAfterAction(), 600);
        }
      }
    },
    [copyToClipboard, showToast, maybeShowAfterAction]
  );

  const handleShare = useCallback((jot: Jot) => {
    setShareJot(jot);
  }, []);

  const handleInvite = useCallback((jot: Jot) => {
    setInviteJot(jot);
  }, []);

  const handleInviteSave = useCallback(
    async (collaborators: string[]) => {
      if (!inviteJot) return;
      await editJot(inviteJot.id, { collaborators });
      setInviteJot(null);
      showToast("Collaborators updated", "saved");
      if (!checkIsPro()) {
        setTimeout(() => maybeShowAfterAction(), 600);
      }
    },
    [inviteJot, editJot, showToast, maybeShowAfterAction]
  );

  const handleDelete = useCallback(
    (jot: Jot) => {
      if (!uid || isAnonymous) {
        onRequireAuth();
        return;
      }
      setConfirmDeleteJot(jot);
    },
    [uid, isAnonymous, onRequireAuth]
  );

  const confirmDelete = useCallback(async () => {
    const jot = confirmDeleteJot;
    setConfirmDeleteJot(null);
    if (!jot) return;
    const ok = await deleteJot(jot.id);
    if (ok) {
      showToast("Deleted", "deleted");
      const timeout = setTimeout(() => setUndoDelete(null), 5000);
      setUndoDelete({ jot, timeout });
      if (!checkIsPro()) {
        setTimeout(() => showInterstitialNow(), 500);
      }
    } else {
      showToast("Couldn't delete note", "deleted");
    }
  }, [confirmDeleteJot, deleteJot, showToast, showInterstitialNow]);

  const handleUndoDelete = useCallback(async () => {
    if (!undoDelete) return;
    clearTimeout(undoDelete.timeout);
    await createJot(undoDelete.jot.body, {
      headline: undoDelete.jot.headline,
      tags: undoDelete.jot.tags,
      category: undoDelete.jot.category,
      isNote: undoDelete.jot.isNote,
      noteColor: undoDelete.jot.noteColor,
    });
    setUndoDelete(null);
    showToast("Restored", "saved");
  }, [undoDelete, createJot, showToast]);

  const handlePin = useCallback(
    async (jot: Jot) => {
      await togglePin(jot.id);
      if (!checkIsPro()) {
        setTimeout(() => maybeShowAfterAction(), 600);
      }
    },
    [togglePin, maybeShowAfterAction]
  );

  const notes = useMemo(() => {
    let base = filteredJots;
    if (noteFilter === "sticky") base = base.filter((j) => !!j.isNote);
    else if (noteFilter === "notes") base = base.filter((j) => !j.isNote);
    return base.filter((j) => !j.isPinned);
  }, [filteredJots, noteFilter]);

  type GridRow =
    | { key: string; type: "notes"; notes: Jot[] }
    | { key: string; type: "ad" };

  const showInlineAds = !checkIsPro() && noteFilter !== "sticky";

  const gridRows = useMemo<GridRow[]>(() => {
    const rows: GridRow[] = [];
    for (let i = 0; i < notes.length; i += 2) {
      const seg = notes.slice(i, i + 2);
      rows.push({ key: `note-${i}`, type: "notes", notes: seg });
      if (showInlineAds && i + 2 < notes.length) {
        rows.push({ key: `ad-${i}`, type: "ad" });
      }
    }
    return rows;
  }, [notes, showInlineAds]);

  const renderNoteCard = useCallback(
    (jot: Jot) => (
      <JotCard
        jot={jot}
        isDark={isDark}
        onPress={() => handleEditJot(jot)}
        onCopy={() => handleCopy(jot)}
        onShare={() => handleShare(jot)}
        onInvite={() => handleInvite(jot)}
        onPin={() => handlePin(jot)}
        onEdit={() => handleEditJot(jot)}
        onDelete={() => handleDelete(jot)}
      />
    ),
    [isDark, handleEditJot, handleCopy, handleShare, handleInvite, handlePin, handleDelete]
  );

  const renderStickyNoteCard = useCallback(
    (jot: Jot) => (
      <StickyNoteCard
        jot={jot}
        isDark={isDark}
        onPress={() => handleEditJot(jot)}
        onCopy={() => handleCopy(jot)}
        onShare={() => handleShare(jot)}
        onInvite={() => handleInvite(jot)}
        onPin={() => handlePin(jot)}
        onEdit={() => handleEditJot(jot)}
        onDelete={() => handleDelete(jot)}
      />
    ),
    [isDark, handleEditJot, handleCopy, handleShare, handleInvite, handlePin, handleDelete]
  );

  const limitApproaching = jotCount > 40 && jotCount < FREE_JOT_LIMIT && !checkIsPro();

  const listHeader = useMemo(() => (
    <View>
      {noteFilter !== "sticky" && !checkIsPro() && <AdNative isDark={isDark} />}

      {pinnedJots.length > 0 && (
        <View>
          <Text style={[styles.sectionLabel, { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }]}>
            Pinned
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pinnedScroll}
          >
            {pinnedJots.map((jot) => {
              const notePalette = jot.isNote
                ? STICKY_NOTE_COLORS[jot.noteColor || DEFAULT_NOTE_COLOR]
                : null;
              const paperColor = notePalette ? notePalette.paper : isDark ? Colors.dark.card : Colors.light.card;
              const borderColor = notePalette ? "rgba(0,0,0,0.08)" : isDark ? Colors.dark.border : Colors.light.border;
              const inkColor = notePalette ? notePalette.ink : isDark ? Colors.dark.text : Colors.light.text;
              const mutedInkColor = notePalette ? "rgba(0,0,0,0.55)" : isDark ? Colors.dark.textMuted : Colors.light.textMuted;
              return (
                <Pressable
                  key={jot.id}
                  style={[
                    styles.pinnedCard,
                    { backgroundColor: paperColor, borderColor },
                  ]}
                  onPress={() => handleEditJot(jot)}
                  onLongPress={() => handleDelete(jot)}
                >
                  <Text style={[styles.pinnedHeadline, { color: inkColor }]} numberOfLines={2}>
                    {jot.headline || "Untitled"}
                  </Text>
                  <Text style={[styles.pinnedBody, { color: mutedInkColor }]} numberOfLines={2}>
                    {jot.body}
                  </Text>
                  <Text style={[styles.pinnedTime, { color: notePalette ? "rgba(0,0,0,0.5)" : isDark ? Colors.dark.accentText : Colors.light.accentText }]}>{getRelativeTime(jot.updatedAt || jot.createdAt)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {sortMenuVisible && (
        <View style={styles.sortBar}>
          {SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              style={[
                styles.sortPill,
                {
                  backgroundColor: sortOption === opt.key ? Colors.accent : isDark ? Colors.dark.card : Colors.light.input,
                  borderColor: sortOption === opt.key ? Colors.accent : isDark ? Colors.dark.border : Colors.light.border,
                },
              ]}
              onPress={() => {
                setSortOption(opt.key);
                setSortMenuVisible(false);
              }}
            >
              <Text
                style={[
                  styles.sortPillText,
                  { color: sortOption === opt.key ? Colors.onAccent : isDark ? Colors.dark.textSecondary : Colors.light.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  ), [pinnedJots, sortMenuVisible, sortOption, isDark, handleEditJot, handleDelete, setSortOption, noteFilter, unpinnedJots.length]);

  const emptyState = useMemo(() => {
    if (noteFilter === "sticky" && wallJots.length === 0 && !searchQuery) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="albums-outline" size={48} color={isDark ? Colors.dark.textMuted : Colors.light.textMuted} />
          <Text style={[styles.emptyTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            No sticky notes yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
            Sticky notes are colorful, glanceable notes. Tap + and choose the Sticky note type to create one.
          </Text>
        </View>
      );
    }
    if (noteFilter === "notes" && regularJots.length === 0 && wallJots.length > 0 && !searchQuery) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color={isDark ? Colors.dark.textMuted : Colors.light.textMuted} />
          <Text style={[styles.emptyTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
            No regular notes yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
            You have sticky notes but no regular notas. Save a text note to see it here.
          </Text>
        </View>
      );
    }
    if (searchQuery) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={isDark ? Colors.dark.textMuted : Colors.light.textMuted} />
          <Text style={[styles.emptyTitle, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
            No results for "{searchQuery}"
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={48} color={isDark ? Colors.dark.textMuted : Colors.light.textMuted} />
        <Text style={[styles.emptyTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
          {noteFilter === "sticky" ? "No sticky notes yet" : "Your Notas will appear here"}
        </Text>
        {EXAMPLE_JOTS.map((ex, i) => (
          <View
            key={i}
            style={[styles.exampleCard, { backgroundColor: isDark ? Colors.dark.card : Colors.light.card, borderColor: isDark ? Colors.dark.border : Colors.light.border }]}
          >
            <Text style={[styles.exampleHeadline, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{ex.headline}</Text>
            <Text style={[styles.exampleBody, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]} numberOfLines={2}>{ex.body}</Text>
          </View>
        ))}
        {!checkIsPro() && <AdInlineBanner isDark={isDark} />}
      </View>
    );
  }, [searchQuery, isDark, noteFilter, wallJots.length, regularJots.length]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg }]}
      edges={["bottom"]}
    >
      <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg }]}>
        <View style={[styles.searchRow, { backgroundColor: isDark ? Colors.dark.card : Colors.light.input, borderColor: isDark ? Colors.dark.border : Colors.light.border }]}>
          <Ionicons name="search" size={16} color={isDark ? Colors.dark.textMuted : Colors.light.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? Colors.dark.text : Colors.light.text }]}
            placeholder="Search notas..."
            placeholderTextColor={isDark ? Colors.dark.textMuted : Colors.light.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            blurOnSubmit={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={isDark ? Colors.dark.textMuted : Colors.light.textMuted} />
            </Pressable>
          )}
          <Pressable
            onPress={() => setSortMenuVisible(!sortMenuVisible)}
            hitSlop={10}
            style={styles.sortToggleBtn}
            accessibilityRole="button"
            accessibilityLabel="Sort jots"
            accessibilityState={{ expanded: sortMenuVisible }}
          >
            <Ionicons name="swap-vertical" size={16} color={isDark ? Colors.dark.textSecondary : Colors.light.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View
            style={[styles.statCard, { backgroundColor: isDark ? Colors.dark.card : Colors.light.card, borderColor: isDark ? Colors.dark.border : Colors.light.border }]}
          >
            <Ionicons name="document-text-outline" size={16} color={isDark ? Colors.dark.accentText : Colors.light.accentText} />
            <View style={styles.statBody}>
              <Text style={[styles.statValue, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{jots.length}</Text>
              <Text style={[styles.statLabel, { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }]}>Total Notes</Text>
            </View>
          </View>
          <View
            style={[styles.statCard, { backgroundColor: isDark ? Colors.dark.card : Colors.light.card, borderColor: isDark ? Colors.dark.border : Colors.light.border }]}
          >
            <Ionicons name="albums-outline" size={16} color={isDark ? Colors.dark.accentText : Colors.light.accentText} />
            <View style={styles.statBody}>
              <Text style={[styles.statValue, { color: isDark ? Colors.dark.text : Colors.light.text }]}>{jots.filter((j) => !!j.isNote).length}</Text>
              <Text style={[styles.statLabel, { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }]}>Sticky Notes</Text>
            </View>
          </View>
        </View>

        <View style={styles.chipsRow}>
          {TYPE_OPTIONS.map((opt) => {
            const isActive = noteFilter === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[
                  styles.chip,
                  isActive ? { backgroundColor: Colors.accent, borderColor: Colors.accent } : { backgroundColor: isDark ? Colors.dark.card : Colors.light.card, borderColor: isDark ? Colors.dark.border : Colors.light.border },
                ]}
                onPress={() => {
                  setNoteFilter(opt.key);
                  setCategoryMenuVisible(false);
                  setSortMenuVisible(false);
                }}
              >
                <Ionicons name={opt.icon as any} size={13} color={isActive ? Colors.onAccent : isDark ? Colors.dark.textSecondary : Colors.light.textSecondary} />
                <Text style={[styles.chipText, { color: isActive ? Colors.onAccent : isDark ? Colors.dark.text : Colors.light.text }]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.categoryChipRow}>
          <Pressable
            style={[
              styles.chip,
              selectedCategory
                ? { backgroundColor: Colors.accent, borderColor: Colors.accent }
                : { backgroundColor: isDark ? Colors.dark.card : Colors.light.card, borderColor: isDark ? Colors.dark.border : Colors.light.border },
            ]}
            onPress={() => {
              setCategoryMenuVisible((v) => !v);
              setSortMenuVisible(false);
            }}
          >
            <Ionicons name="folder-outline" size={13} color={selectedCategory ? Colors.onAccent : isDark ? Colors.dark.textSecondary : Colors.light.textSecondary} />
            <Text style={[styles.chipText, { color: selectedCategory ? Colors.onAccent : isDark ? Colors.dark.textMuted : Colors.light.textMuted }]}>Category</Text>
            <Text style={[styles.chipValueText, { color: isDark ? Colors.dark.text : Colors.light.text }]} numberOfLines={1}>
              {CATEGORY_OPTIONS.find((o) => o.key === selectedCategory)?.label ?? "All"}
            </Text>
            <Ionicons name="chevron-down" size={12} color={selectedCategory ? Colors.onAccent : isDark ? Colors.dark.textMuted : Colors.light.textMuted} />
          </Pressable>
        </View>

        {categoryMenuVisible && (
          <View style={[styles.filterMenu, { backgroundColor: isDark ? Colors.dark.card : Colors.light.card, borderColor: isDark ? Colors.dark.border : Colors.light.border }]}>
            {CATEGORY_OPTIONS.map((opt) => {
              const isActive = (selectedCategory ?? null) === opt.key;
              return (
                <Pressable
                  key={opt.key ?? "all"}
                  style={[styles.filterMenuItem, isActive && { backgroundColor: isDark ? Colors.dark.accentLight : Colors.light.accentLight }]}
                  onPress={() => {
                    setSelectedCategory(opt.key);
                    setCategoryMenuVisible(false);
                  }}
                >
                  <Ionicons name={opt.icon as any} size={16} color={isActive ? Colors.accent : isDark ? Colors.dark.textSecondary : Colors.light.textSecondary} />
                  <Text style={[styles.filterMenuItemText, { color: isActive ? Colors.accent : isDark ? Colors.dark.text : Colors.light.text }]}>
                    {opt.label}
                  </Text>
                  {isActive && <Ionicons name="checkmark" size={16} color={Colors.accent} />}
                </Pressable>
              );
            })}
          </View>
        )}

        <FlatList
          key={`${noteFilter}-${selectedCategory || "all"}`}
          data={gridRows}
          keyExtractor={(row: GridRow) => row.key}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyState}
          renderItem={({ item }) => {
            if (item.type === "ad") {
              return (
                <View style={styles.adRow}>
                  <AdInlineBanner key={item.key} isDark={isDark} />
                </View>
              );
            }
            const first = item.notes[0];
            const second = item.notes[1];
            return (
              <View style={styles.noteRow}>
                <View style={styles.wallCell}>
                  {first.isNote ? renderStickyNoteCard(first) : renderNoteCard(first)}
                </View>
                {second && (
                  <View style={styles.wallCell}>
                    {second.isNote ? renderStickyNoteCard(second) : renderNoteCard(second)}
                  </View>
                )}
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
        />

        {limitApproaching && (
          <Text style={[styles.limitText, { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }]}>
            {jotCount} of {FREE_JOT_LIMIT} Notas
          </Text>
        )}

        <Pressable style={styles.fab} onPress={handleCreateJot}>
          <Ionicons name="add" size={28} color={Colors.onAccent} />
        </Pressable>

        <JotEditor
          isVisible={editorVisible}
          isDark={isDark}
          isPro={checkIsPro()}
          onOpenPaywall={onOpenPaywall}
          editJot={editingJot}
          initialText={!editingJot ? initialSharedBody ?? undefined : undefined}
          onSave={handleEditorSave}
          onClose={() => {
            setEditorVisible(false);
            setEditingJot(null);
            setInitialSharedBody(null);
          }}
        />

        {shareJot && (
          <ShareCard
            jot={shareJot}
            isDark={isDark}
            isPro={checkIsPro()}
            onOpenPaywall={onOpenPaywall}
            onShareText={async () => {
              trackEvent({ event: "share_started", params: { type: "text" } });
              const text = shareJot.headline ? `${shareJot.headline}\n\n${shareJot.body}` : shareJot.body;
              await shareText(text, shareJot.headline || "Shared from Nota");
              trackEvent({ event: "share_completed", params: { type: "text" } });
              await trackFirstShare();
              setShareJot(null);
            }}
            onShareImage={async () => {
              setShareJot(null);
            }}
            onCopy={async () => {
              await handleCopy(shareJot);
              setShareJot(null);
            }}
            onClose={() => setShareJot(null)}
          />
        )}

        {inviteJot && (
          <CollaborationModal
            jot={inviteJot}
            isDark={isDark}
            onSave={handleInviteSave}
            onClose={() => setInviteJot(null)}
            isPro={checkIsPro()}
          />
        )}

        {confirmDeleteJot && (
          <Modal
            transparent
            visible
            animationType="fade"
            onRequestClose={() => setConfirmDeleteJot(null)}
          >
            <View style={styles.modalBackdrop}>
              <View style={[styles.confirmCard, { backgroundColor: isDark ? Colors.dark.card : Colors.light.card }]}>
                <View style={[styles.confirmIconCircle, { backgroundColor: isDark ? "rgba(220,38,38,0.15)" : "rgba(220,38,38,0.1)" }]}>
                  <Ionicons name="trash-outline" size={26} color={Colors.danger} />
                </View>
                <Text style={[styles.confirmTitle, { color: isDark ? Colors.dark.text : Colors.light.text }]}>
                  Delete this nota?
                </Text>
                <Text
                  style={[styles.confirmMessage, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}
                  numberOfLines={3}
                >
                  "{confirmDeleteJot.headline || "Untitled"}" will be permanently deleted. This can't be undone.
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    style={[styles.confirmBtn, styles.confirmBtnCancel, { borderColor: isDark ? Colors.dark.border : Colors.light.border }]}
                    onPress={() => setConfirmDeleteJot(null)}
                  >
                    <Text style={[styles.confirmBtnText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.confirmBtn, { backgroundColor: Colors.danger }]} onPress={confirmDelete}>
                    <Text style={[styles.confirmBtnText, styles.confirmBtnDeleteText]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {toastMessage && (
          <Animated.View
            style={[
              styles.toast,
              {
                backgroundColor:
                  toastType === "saved" ? Colors.accent : toastType === "deleted" ? Colors.danger : Colors.success,
                opacity: toastAnim,
                transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              },
            ]}
          >
            {toastType === "deleted" && undoDelete ? (
              <View style={styles.toastWithUndo}>
                <Text style={styles.toastText}>{toastMessage}</Text>
                <Pressable onPress={handleUndoDelete} style={styles.undoBtn}>
                  <Text style={styles.undoText}>UNDO</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.toastText}>{toastMessage}</Text>
            )}
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 40,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
  },
  sortToggleBtn: {
    padding: Spacing.xs,
  },
  filterMenu: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.xs,
    ...Shadow.sm,
  },
  filterMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  filterMenuItemText: {
    flex: 1,
    fontSize: FontSize.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  statBody: {
    flex: 1,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    lineHeight: 20,
  },
  statLabel: {
    fontSize: FontSize.xs,
  },
  chipsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    height: 36,
    paddingHorizontal: Spacing.sm,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chipValueText: {
    fontSize: 12,
    fontWeight: "700",
  },
  categoryChipRow: {
    marginHorizontal: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pinnedScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  pinnedCard: {
    width: 160,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pinnedHeadline: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.md,
    marginBottom: Spacing.xs,
  },
  pinnedBody: {
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  pinnedTime: {
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  sortBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  sortPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  sortPillText: {
    fontSize: FontSize.xs,
    fontWeight: "500",
  },
  listContent: {
    paddingBottom: 120,
  },
  noteRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  adRow: {
    paddingHorizontal: Spacing.sm,
  },
  wallCell: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  exampleCard: {
    width: "100%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    opacity: 0.6,
  },
  exampleHeadline: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.md,
    marginBottom: Spacing.xs,
  },
  exampleBody: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  limitText: {
    textAlign: "center",
    fontSize: FontSize.xs,
    paddingBottom: Spacing.sm,
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
    ...Shadow.lg,
  },
  toast: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  toastWithUndo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  toastText: {
    color: Colors.onAccent,
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  undoBtn: {
    paddingHorizontal: Spacing.sm,
  },
  undoText: {
    color: Colors.onAccent,
    fontSize: FontSize.sm,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    ...Shadow.lg,
  },
  confirmIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  confirmTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  confirmMessage: {
    fontSize: FontSize.md,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  confirmActions: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnCancel: {
    borderWidth: 1,
  },
  confirmBtnText: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  confirmBtnDeleteText: {
    color: "#fff",
    fontWeight: "700",
  },
});
