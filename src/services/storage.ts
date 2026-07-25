import { Platform } from "react-native";

const STORAGE_PREFIX = "jotapp";

interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiGet(keys: string[]): Promise<[string, string | null][]>;
  clear(): Promise<void>;
}

let storageAdapter: StorageAdapter | null = null;

async function getStorage(): Promise<StorageAdapter> {
  if (storageAdapter) return storageAdapter;

  if (Platform.OS === "web") {
    storageAdapter = {
      async getItem(key) {
        return localStorage.getItem(`${STORAGE_PREFIX}_${key}`);
      },
      async setItem(key, value) {
        localStorage.setItem(`${STORAGE_PREFIX}_${key}`, value);
      },
      async removeItem(key) {
        localStorage.removeItem(`${STORAGE_PREFIX}_${key}`);
      },
      async multiGet(keys) {
        return keys.map((k) => [k, localStorage.getItem(`${STORAGE_PREFIX}_${k}`)]);
      },
      async clear() {
        localStorage.clear();
      },
    };
  } else {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    storageAdapter = {
      async getItem(key) {
        return AsyncStorage.getItem(`${STORAGE_PREFIX}_${key}`);
      },
      async setItem(key, value) {
        await AsyncStorage.setItem(`${STORAGE_PREFIX}_${key}`, value);
      },
      async removeItem(key) {
        await AsyncStorage.removeItem(`${STORAGE_PREFIX}_${key}`);
      },
      async multiGet(keys) {
        const result = await AsyncStorage.multiGet(keys.map((k) => `${STORAGE_PREFIX}_${k}`));
        return result as [string, string | null][];
      },
      async clear() {
        await AsyncStorage.clear();
      },
    };
  }

  return storageAdapter!;
}

export async function storageGet(key: string): Promise<string | null> {
  const store = await getStorage();
  return store.getItem(key);
}

export async function storageSet(key: string, value: string): Promise<void> {
  const store = await getStorage();
  await store.setItem(key, value);
}

export async function storageRemove(key: string): Promise<void> {
  const store = await getStorage();
  await store.removeItem(key);
}

export async function storageMultiGet(keys: string[]): Promise<[string, string | null][]> {
  const store = await getStorage();
  return store.multiGet(keys);
}

export async function storageClear(): Promise<void> {
  const store = await getStorage();
  await store.clear();
}
