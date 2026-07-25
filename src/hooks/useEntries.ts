import { useState, useEffect, useCallback } from "react";
import { TextEntry, getEntries, addEntry, updateEntry, deleteEntry } from "../services/firebase";

interface UseEntriesReturn {
  entries: TextEntry[];
  isLoading: boolean;
  createEntry: (headline: string, content: string) => Promise<TextEntry | null>;
  editEntry: (id: string, headline: string, content: string) => Promise<boolean>;
  removeEntry: (id: string) => Promise<boolean>;
  refreshEntries: () => Promise<void>;
}

export function useEntries(isUserLoggedIn: boolean): UseEntriesReturn {
  const [entries, setEntries] = useState<TextEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, [isUserLoggedIn]);

  async function loadEntries() {
    setIsLoading(true);
    try {
      const data = await getEntries();
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }

  const createEntry = useCallback(
    async (headline: string, content: string): Promise<TextEntry | null> => {
      const entry = await addEntry(headline, content);
      if (entry) {
        setEntries((prev) => [entry, ...prev]);
      }
      return entry;
    },
    []
  );

  const editEntry = useCallback(
    async (id: string, headline: string, content: string): Promise<boolean> => {
      const success = await updateEntry(id, headline, content);
      if (success) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, headline, content, updatedAt: Date.now() } : e
          )
        );
      }
      return success;
    },
    []
  );

  const removeEntry = useCallback(
    async (id: string): Promise<boolean> => {
      const success = await deleteEntry(id);
      if (success) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
      return success;
    },
    []
  );

  const refreshEntries = useCallback(async () => {
    await loadEntries();
  }, []);

  return {
    entries,
    isLoading,
    createEntry,
    editEntry,
    removeEntry,
    refreshEntries,
  };
}
