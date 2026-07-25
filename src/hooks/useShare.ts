import { useCallback } from "react";
import { Platform } from "react-native";

export function useShare() {
  const copyToClipboard = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        if (Platform.OS === "web") {
          await navigator.clipboard.writeText(text);
          return true;
        }
        const Clipboard = await import("expo-clipboard");
        await Clipboard.setStringAsync(text);
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const shareContent = useCallback(
    async (content: string, title?: string): Promise<boolean> => {
      try {
        if (Platform.OS === "web") {
          if (navigator.share) {
            await navigator.share({ title: title || "Shared content", text: content });
            return true;
          }
          await navigator.clipboard.writeText(content);
          return true;
        }
        const Sharing = await import("expo-sharing");
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) return false;
        await Sharing.shareAsync(content, { dialogTitle: title || "Share" });
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  return { copyToClipboard, shareContent };
}
