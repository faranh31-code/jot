import { useState, useEffect, useCallback, useRef } from "react";
import { TextEntry, getEntries, addEntry, updateEntry, deleteEntry } from "../services/firebase";

interface UseEntriesReturn {
  entries: TextEntry[];
  isLoading: boolean;
  createEntry: (headline: string, content: string) => Promise<TextEntry | null>;
  editEntry: (id: string, headline: string, content: string) => Promise<boolean>;
  removeEntry: (id: string) => Promise<boolean>;
  refreshEntries: () => Promise<void>;
}

export function useEntries(uid: string | null): UseEntriesReturn {
  const [entries, setEntries] = useState<TextEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const uidRef = useRef(uid);
  uidRef.current = uid;

  useEffect(() => {
    loadEntries();
  }, [uid]);

  async function loadEntries() {
    setIsLoading(true);
    try {
      const data = await getEntries(uid || undefined);
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
    setIsLoading(true);
    try {
      const data = await getEntries(uidRef.current || undefined);
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
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
