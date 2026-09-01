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
  SafeAreaView,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, BorderRadius, Spacing, FontSize, Shadow, FontFamily } from "../constants/theme";
import { useJot } from "../hooks/useJot";
import { useShare } from "../hooks/useShare";
import { useInterstitialAd } from "../hooks/useInterstitialAd";
import { useRewardedAd } from "../hooks/useRewardedAd";
import { Jot, JotCategory, CATEGORIES, FREE_JOT_LIMIT } from "../types";
import { isPro as checkIsPro, canCreateJot } from "../services/subscription";
import JotCard from "../components/JotCard";
import JotEditor from "../components/JotEditor";
import ShareCard from "../components/ShareCard";
import AdInlineBanner from "../components/AdInlineBanner";

type SortOption = "newest" | "oldest" | "az" | "za" | "recently_updated" | "pinned_first";

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "az", label: "A \u2192 Z" },
  { key: "za", label: "Z \u2192 A" },
  { key: "recently_updated", label: "Recently updated" },
  { key: "pinned_first", label: "Pinned first" },
];

const CATEGORY_FILTERS: { key: JotCategory | null; label: string }[] = [
  { key: null, label: "All" },
  ...CATEGORIES.map((c) => ({ key: c.key as JotCategory, label: c.label })),
];

interface HomeScreenProps {
  isDark: boolean;
  uid: string | null;
  isAnonymous: boolean;
  onRequireAuth: () => void;
  onOpenSettings: () => void;
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
  onOpenSettings,
  onOpenPaywall,
  sharedText,
  onSharedTextConsumed,
}: HomeScreenProps) {
  const {
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

  const { copyToClipboard, shareText, clipboardCheck } = useShare();
  const { showNow: showInterstitialNow } = useInterstitialAd();
  const { isReady: isRewardedReady, show: showRewardedAd } = useRewardedAd();

  const [refreshing, setRefreshing] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingJot, setEditingJot] = useState<Jot | null>(null);
  const [clipboardText, setClipboardText] = useState<string | null>(null);
  const [shareJot, setShareJot] = useState<Jot | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"saved" | "deleted" | "copied">("saved");
  const [undoDelete, setUndoDelete] = useState<{ jot: Jot; timeout: ReturnType<typeof setTimeout> } | null>(null);
  const [initialSharedBody, setInitialSharedBody] = useState<string | null>(null);
  const [rewardedBonusRemaining, setRewardedBonusRemaining] = useState(0);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!uid || isAnonymous) return;
    clipboardCheck().then((text) => {
      if (text && text.trim().length > 10) {
        setClipboardText(text.trim());
      }
    });
  }, [uid, isAnonymous]);

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
        `You've reached the ${FREE_JOT_LIMIT} Jot limit. Upgrade to Pro for unlimited, or watch a short ad to save one more.`,
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
    async (headline: string, body: string, tags: string[], category: JotCategory) => {
      if (!uid || isAnonymous) {
        onRequireAuth();
        return;
      }
      if (editingJot) {
        await editJot(editingJot.id, { headline, body, tags, category });
        showToast("Saved", "saved");
      } else {
        if (!canCreateJot(jotCount) && rewardedBonusRemaining <= 0) {
          onOpenPaywall("limit");
          return;
        }
        if (!canCreateJot(jotCount) && rewardedBonusRemaining > 0) {
          setRewardedBonusRemaining((prev) => prev - 1);
        }
        await createJot(body, { headline, tags, category });
        showToast("Saved", "saved");
      }
      setEditorVisible(false);
      setEditingJot(null);
      setInitialSharedBody(null);
    },
    [
      editingJot, uid, isAnonymous, jotCount, rewardedBonusRemaining, onRequireAuth, onOpenPaywall,
      editJot, createJot, showToast,
    ]
  );

  const handleCopy = useCallback(
    async (jot: Jot) => {
      const text = jot.headline ? `${jot.headline}\n\n${jot.body}` : jot.body;
      const success = await copyToClipboard(text);
      if (success) showToast("Copied", "copied");
    },
    [copyToClipboard, showToast]
  );

  const handleShare = useCallback((jot: Jot) => {
    setShareJot(jot);
  }, []);

  const handleDelete = useCallback(
    (jot: Jot) => {
      if (!uid || isAnonymous) {
        onRequireAuth();
        return;
      }
      Alert.alert("Delete Jot", `Delete "${jot.headline || "Untitled"}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteJot(jot.id);
            showToast("Deleted", "deleted");
            const timeout = setTimeout(() => setUndoDelete(null), 5000);
            setUndoDelete({ jot, timeout });
            if (!checkIsPro()) {
              setTimeout(() => showInterstitialNow(), 500);
            }
          },
        },
      ]);
    },
    [uid, isAnonymous, deleteJot, showToast, onRequireAuth]
  );

  const handleUndoDelete = useCallback(async () => {
    if (!undoDelete) return;
    clearTimeout(undoDelete.timeout);
    await createJot(undoDelete.jot.body, {
      headline: undoDelete.jot.headline,
      tags: undoDelete.jot.tags,
      category: undoDelete.jot.category,
    });
    setUndoDelete(null);
    showToast("Restored", "saved");
  }, [undoDelete, createJot, showToast]);

  const handlePin = useCallback(
    async (jot: Jot) => {
      await togglePin(jot.id);
    },
    [togglePin]
  );

  const handlePasteFromClipboard = useCallback(() => {
    if (!uid || isAnonymous) {
      onRequireAuth();
      return;
    }
    if (!clipboardText) return;
    setEditorVisible(true);
    setEditingJot(null);
    setTimeout(() => {
      setClipboardText(null);
    }, 500);
  }, [clipboardText, uid, isAnonymous, onRequireAuth]);

  const adListData = useMemo(() => {
    if (checkIsPro() || unpinnedJots.length === 0) return [];
    const items: { type: "jot" | "ad"; jot?: Jot; adId?: string }[] = [];
    let adCounter = 0;
    unpinnedJots.forEach((jot, index) => {
      items.push({ type: "jot", jot });
      if ((index + 1) % 3 === 0 && index < unpinnedJots.length - 1) {
        adCounter++;
        items.push({ type: "ad", adId: `ad-${adCounter}` });
      }
    });
    return items;
  }, [unpinnedJots]);

  const limitApproaching = jotCount > 40 && jotCount < FREE_JOT_LIMIT && !checkIsPro();

  const listHeader = useMemo(() => (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
        style={styles.categoryRow}
      >
        {CATEGORY_FILTERS.map((cat) => {
          const isActive = selectedCategory === cat.key;
          return (
            <Pressable
              key={cat.key ?? "all"}
              style={[
                styles.categoryPill,
                {
                  backgroundColor: isActive ? Colors.accent : isDark ? Colors.dark.card : Colors.light.input,
                  borderColor: isActive ? Colors.accent : isDark ? Colors.dark.border : Colors.light.border,
                },
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  { color: isActive ? Colors.onAccent : isDark ? Colors.dark.textSecondary : Colors.light.textSecondary },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {clipboardText && (
        <View style={[styles.clipboardCard, { backgroundColor: isDark ? Colors.dark.card : Colors.light.input, borderColor: isDark ? Colors.dark.border : Colors.light.border }]}>
          <Ionicons name="clipboard-outline" size={18} color={isDark ? Colors.dark.accentText : Colors.light.accentText} />
          <Text style={[styles.clipboardText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]} numberOfLines={1}>
            Paste from clipboard
          </Text>
          <Pressable onPress={handlePasteFromClipboard} style={styles.clipboardBtn}>
            <Text style={styles.clipboardBtnText}>Paste</Text>
          </Pressable>
        </View>
      )}

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
            {pinnedJots.map((jot) => (
              <Pressable
                key={jot.id}
                style={[
                  styles.pinnedCard,
                  { backgroundColor: isDark ? Colors.dark.card : Colors.light.card, borderColor: isDark ? Colors.dark.border : Colors.light.border },
                ]}
                onPress={() => handleEditJot(jot)}
                onLongPress={() => handleDelete(jot)}
              >
                <Text style={[styles.pinnedHeadline, { color: isDark ? Colors.dark.text : Colors.light.text }]} numberOfLines={2}>
                  {jot.headline || "Untitled"}
                </Text>
                <Text style={[styles.pinnedBody, { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }]} numberOfLines={2}>
                  {jot.body}
                </Text>
                <Text style={[styles.pinnedTime, { color: isDark ? Colors.dark.accentText : Colors.light.accentText }]}>{getRelativeTime(jot.updatedAt || jot.createdAt)}</Text>
              </Pressable>
            ))}
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
  ), [selectedCategory, clipboardText, pinnedJots, sortMenuVisible, sortOption, isDark, handlePasteFromClipboard, handleEditJot, handleDelete, setSelectedCategory, setSortOption]);

  const emptyState = useMemo(() => {
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
          Your Jots will appear here
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
      </View>
    );
  }, [searchQuery, isDark]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg }]}>
      <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg }]}>
        <View style={[styles.header, { borderBottomColor: isDark ? Colors.dark.border : Colors.light.border }]}>
          <Text style={[styles.logo, { color: isDark ? Colors.dark.text : Colors.light.text }]}>Jot</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={onOpenSettings} style={styles.headerBtn}>
              <Ionicons name="settings-outline" size={22} color={isDark ? Colors.dark.textSecondary : Colors.light.textSecondary} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.searchRow, { backgroundColor: isDark ? Colors.dark.card : Colors.light.input, borderColor: isDark ? Colors.dark.border : Colors.light.border }]}>
          <Ionicons name="search" size={16} color={isDark ? Colors.dark.textMuted : Colors.light.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? Colors.dark.text : Colors.light.text }]}
            placeholder="Search jots..."
            placeholderTextColor={isDark ? Colors.dark.textMuted : Colors.light.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            blurOnSubmit={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={isDark ? Colors.dark.textMuted : Colors.light.textMuted} />
            </Pressable>
          )}
          <Pressable
            onPress={() => setSortMenuVisible(!sortMenuVisible)}
            hitSlop={8}
            style={styles.sortToggleBtn}
          >
            <Ionicons name="swap-vertical" size={16} color={isDark ? Colors.dark.textSecondary : Colors.light.textSecondary} />
          </Pressable>
        </View>

        <FlatList
          data={adListData}
          keyExtractor={(item) => {
            if (item.type === "ad") return item.adId!;
            return item.jot!.id;
          }}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyState}
          renderItem={({ item }) => {
            if (item.type === "ad") {
              return <AdInlineBanner isDark={isDark} />;
            }
            const jot = item.jot!;
            return (
              <JotCard
                jot={jot}
                isDark={isDark}
                onPress={() => handleEditJot(jot)}
                onCopy={() => handleCopy(jot)}
                onShare={() => handleShare(jot)}
                onPin={() => handlePin(jot)}
                onEdit={() => handleEditJot(jot)}
                onDelete={() => handleDelete(jot)}
              />
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
            {jotCount} of {FREE_JOT_LIMIT} Jots
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
          initialText={!editingJot ? initialSharedBody ?? clipboardText ?? undefined : undefined}
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
              const text = shareJot.headline ? `${shareJot.headline}\n\n${shareJot.body}` : shareJot.body;
              await shareText(text, shareJot.headline || "Shared from Jot");
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logo: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.xxl,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerBtn: {
    padding: Spacing.sm,
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
  categoryRow: {
    flexGrow: 0,
  },
  categoryScroll: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
  clipboardCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  clipboardText: {
    flex: 1,
    fontSize: FontSize.md,
  },
  clipboardBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  clipboardBtnText: {
    color: Colors.onAccent,
    fontSize: FontSize.sm,
    fontWeight: "600",
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
});
