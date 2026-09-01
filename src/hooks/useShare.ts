import { useCallback } from "react";
import { Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";

export function useShare() {
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await Clipboard.setStringAsync(text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch {
      return false;
    }
  }, []);

  const shareText = useCallback(
    async (content: string, title?: string): Promise<boolean> => {
      try {
        if (Platform.OS === "web") {
          if (navigator.share) {
            await navigator.share({ title: title || "Shared from Jot", text: content });
            return true;
          }
          await navigator.clipboard.writeText(content);
          return true;
        }
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          return await copyToClipboard(content);
        }
        await Sharing.shareAsync(content, { dialogTitle: title || "Share from Jot" });
        return true;
      } catch {
        return false;
      }
    },
    [copyToClipboard]
  );

  const clipboardCheck = useCallback(async (): Promise<string | null> => {
    try {
      const has = await Clipboard.hasStringAsync();
      if (!has) return null;
      const text = await Clipboard.getStringAsync();
      return text && text.trim().length > 0 ? text : null;
    } catch {
      return null;
    }
  }, []);

  return {
    copyToClipboard,
    shareText,
    clipboardCheck,
  };
}
