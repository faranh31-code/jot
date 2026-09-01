// Web build stub — expo-share-intent is native-only (requires a custom dev
// client, not just a bundler target), so this gives the web bundle a no-op
// implementation instead of crashing at import time. Native builds use
// useShareIntentSafe.ts (the real hook) via Metro's platform resolution.
export function useShareIntent() {
  return {
    hasShareIntent: false,
    shareIntent: null as { text?: string | null } | null,
    resetShareIntent: () => {},
    error: null as string | null,
  };
}
