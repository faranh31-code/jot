import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Jot,
  addJot,
  updateJot,
  deleteJot,
  getJots,
  togglePinJot,
  toggleFavoriteJot,
  onAuthStateChanged,
} from "../services/firebase";
import { SortOption, JotCategory } from "../types";

function detectHeadline(body: string): string {
  const firstLine = body.split("\n")[0]?.trim();
  if (!firstLine) return "Untitled Jot";
  if (firstLine.length <= 60) return firstLine;
  return firstLine.substring(0, 57) + "...";
}

function sortJots(jots: Jot[], sort: SortOption): Jot[] {
  const sorted = [...jots];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
    case "oldest":
      return sorted.sort((a, b) => a.createdAt - b.createdAt);
    case "az":
      return sorted.sort((a, b) => a.headline.localeCompare(b.headline));
    case "za":
      return sorted.sort((a, b) => b.headline.localeCompare(a.headline));
    case "recently_updated":
      return sorted.sort((a, b) => b.updatedAt - a.updatedAt);
    case "pinned_first":
      return sorted.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
      });
    default:
      return sorted;
  }
}

function filterJots(
  jots: Jot[],
  search: string,
  tag: string | null,
  category: JotCategory | null
): Jot[] {
  let result = jots;

  if (tag) {
    result = result.filter((j) => j.tags.includes(tag));
  }

  if (category) {
    result = result.filter((j) => j.category === category);
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    result = result.filter(
      (j) =>
        j.headline.toLowerCase().includes(q) ||
        j.body.toLowerCase().includes(q) ||
        j.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  return result;
}

export function useJot() {
  const [jots, setJots] = useState<Jot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("pinned_first");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<JotCategory | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const isLoggedInRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged((user) => {
      const loggedIn = !!user;
      setIsLoggedIn(loggedIn);
      isLoggedInRef.current = loggedIn;
    });
    return unsub;
  }, []);

  const loadJots = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getJots();
      setJots(data);
    } catch {
      setJots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJots();
  }, [isLoggedIn, loadJots]);

  const createJot = useCallback(
    async (
      body: string,
      options?: { headline?: string; tags?: string[]; category?: JotCategory }
    ): Promise<Jot | null> => {
      const headline = options?.headline || detectHeadline(body);
      const jot = await addJot(headline, body, {
        tags: options?.tags,
        category: options?.category,
      });
      if (jot) {
        setJots((prev) => [jot, ...prev]);
      }
      return jot;
    },
    []
  );

  const editJot = useCallback(
    async (
      id: string,
      updates: { headline?: string; body?: string; tags?: string[]; category?: JotCategory }
    ): Promise<boolean> => {
      const success = await updateJot(id, updates);
      if (success) {
        setJots((prev) =>
          prev.map((j) =>
            j.id === id ? { ...j, ...updates, updatedAt: Date.now() } : j
          )
        );
      }
      return success;
    },
    []
  );

  const deleteJotById = useCallback(
    async (id: string): Promise<boolean> => {
      const success = await deleteJot(id);
      if (success) {
        setJots((prev) => prev.filter((j) => j.id !== id));
      }
      return success;
    },
    []
  );

  const togglePin = useCallback(
    async (id: string): Promise<boolean> => {
      const success = await togglePinJot(id);
      if (success) {
        setJots((prev) =>
          prev.map((j) =>
            j.id === id ? { ...j, isPinned: !j.isPinned, updatedAt: Date.now() } : j
          )
        );
      }
      return success;
    },
    []
  );

  const toggleFavorite = useCallback(
    async (id: string): Promise<boolean> => {
      const success = await toggleFavoriteJot(id);
      if (success) {
        setJots((prev) =>
          prev.map((j) =>
            j.id === id
              ? { ...j, isFavorite: !j.isFavorite, updatedAt: Date.now() }
              : j
          )
        );
      }
      return success;
    },
    []
  );

  const addTag = useCallback(
    async (id: string, tag: string): Promise<boolean> => {
      const jot = jots.find((j) => j.id === id);
      if (!jot || jot.tags.includes(tag)) return false;
      const newTags = [...jot.tags, tag];
      const success = await updateJot(id, { tags: newTags });
      if (success) {
        setJots((prev) =>
          prev.map((j) =>
            j.id === id ? { ...j, tags: newTags, updatedAt: Date.now() } : j
          )
        );
      }
      return success;
    },
    [jots]
  );

  const removeTag = useCallback(
    async (id: string, tag: string): Promise<boolean> => {
      const jot = jots.find((j) => j.id === id);
      if (!jot) return false;
      const newTags = jot.tags.filter((t) => t !== tag);
      const success = await updateJot(id, { tags: newTags });
      if (success) {
        setJots((prev) =>
          prev.map((j) =>
            j.id === id ? { ...j, tags: newTags, updatedAt: Date.now() } : j
          )
        );
      }
      return success;
    },
    [jots]
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    jots.forEach((j) => j.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [jots]);

  const filteredJots = useMemo(() => {
    const filtered = filterJots(jots, searchQuery, selectedTag, selectedCategory);
    return sortJots(filtered, sortOption);
  }, [jots, searchQuery, selectedTag, selectedCategory, sortOption]);

  return {
    jots,
    filteredJots,
    isLoading,
    createJot,
    editJot,
    deleteJot: deleteJotById,
    togglePin,
    toggleFavorite,
    addTag,
    removeTag,
    refreshJots: loadJots,
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    selectedTag,
    setSelectedTag,
    selectedCategory,
    setSelectedCategory,
    allTags,
    jotCount: jots.length,
  };
}
