import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { storageGet, storageSet } from "../services/storage";

const STORAGE_KEYS = {
  HAS_REVIEWED: "review_has_reviewed",
  DISMISSED_AT: "review_dismissed_at",
} as const;

const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

export function useReviewPrompt() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  useEffect(() => {
    loadState();
  }, []);

  async function loadState() {
    try {
      const reviewed = await storageGet(STORAGE_KEYS.HAS_REVIEWED);
      const dismissed = await storageGet(STORAGE_KEYS.DISMISSED_AT);
      setHasReviewed(reviewed === "true");
      setDismissedAt(dismissed ? parseInt(dismissed, 10) : null);
    } catch {
      setHasReviewed(false);
      setDismissedAt(null);
    }
  }

  const triggerHappyMoodReview = useCallback(async () => {
    if (hasReviewed) return;
    if (dismissedAt !== null) {
      const elapsed = Date.now() - dismissedAt;
      if (elapsed < COOLDOWN_MS) return;
    }
    setIsModalVisible(true);
  }, [hasReviewed, dismissedAt]);

  const handleUserReviewed = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        window.open("https://play.google.com/store/apps/details?id=com.faran.textsaver", "_blank");
      } else {
        const StoreReview = await import("expo-store-review");
        const isAvailable = await StoreReview.isAvailableAsync();
        if (isAvailable) {
          await StoreReview.requestReview();
        }
      }
    } catch {}

    try {
      await storageSet(STORAGE_KEYS.HAS_REVIEWED, "true");
      setHasReviewed(true);
    } catch {}

    setIsModalVisible(false);
  }, []);

  const handleUserDismissed = useCallback(async () => {
    try {
      const now = Date.now().toString();
      await storageSet(STORAGE_KEYS.DISMISSED_AT, now);
      setDismissedAt(Date.now());
    } catch {}
    setIsModalVisible(false);
  }, []);

  return {
    isModalVisible,
    triggerHappyMoodReview,
    handleUserReviewed,
    handleUserDismissed,
  };
}
