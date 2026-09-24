import { useState, useEffect, useCallback } from "react";
import { storageGet, storageSet } from "../services/storage";

const KEYS = {
  IS_DARK: "settings_is_dark",
} as const;

export function useAppSettings() {
  const [isDark, setIsDark] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const dark = await storageGet(KEYS.IS_DARK);
      setIsDark(dark === "true");
    } catch {
      setIsDark(false);
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

  return {
    isDark,
    isLoaded,
    toggleTheme,
  };
}