import { useState, useEffect, useCallback } from "react";
import { storageGet, storageSet } from "../services/storage";

const KEYS = {
  IS_DARK: "settings_is_dark",
  ONBOARDING_DONE: "settings_onboarding_done",
  GUIDE_SEEN: "settings_guide_seen",
} as const;

export function useAppSettings() {
  const [isDark, setIsDark] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const [dark, onboard, guide] = await Promise.all([
        storageGet(KEYS.IS_DARK),
        storageGet(KEYS.ONBOARDING_DONE),
        storageGet(KEYS.GUIDE_SEEN),
      ]);
      setIsDark(dark !== "false");
      setHasCompletedOnboarding(onboard === "true");
      setHasSeenGuide(guide === "true");
    } catch {
      setIsDark(true);
      setHasCompletedOnboarding(false);
      setHasSeenGuide(false);
    } finally {
      setIsLoaded(true);
    }
  }

  const toggleTheme = useCallback(async () => {
    setIsDark((prev) => {
      const next = !prev;
      storageSet(KEYS.IS_DARK, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    setHasCompletedOnboarding(true);
    await storageSet(KEYS.ONBOARDING_DONE, "true").catch(() => {});
  }, []);

  const markGuideSeen = useCallback(async () => {
    setHasSeenGuide(true);
    await storageSet(KEYS.GUIDE_SEEN, "true").catch(() => {});
  }, []);

  return {
    isDark,
    hasCompletedOnboarding,
    hasSeenGuide,
    isLoaded,
    toggleTheme,
    completeOnboarding,
    markGuideSeen,
  };
}
