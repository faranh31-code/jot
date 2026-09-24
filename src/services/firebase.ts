import { Platform } from "react-native";
import { initializeApp, getApps, getApp } from "firebase/app";
// @firebase/auth (not the "firebase/auth" convenience re-export) is used here
// because only this package's export map has a "react-native" condition
// whose *runtime* build includes getReactNativePersistence. TS still resolves
// types from the platform-agnostic auth-public.d.ts, which omits that one
// symbol — a known @firebase/auth/TS exports-conditions gap — so it's
// imported separately below with a type-check suppression.
import {
  getAuth,
  initializeAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  deleteUser,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  signInWithCredential,
  signInAnonymously as firebaseSignInAnonymously,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from "@firebase/auth";
// @ts-expect-error — getReactNativePersistence exists at runtime (rn build) but isn't in @firebase/auth's resolved .d.ts
import { getReactNativePersistence } from "@firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  setDoc,
  getDoc,
} from "firebase/firestore";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD0L5qly0KIhAZilFUb2uJzmhceGXhIRZQ",
  authDomain: "ai-bulk-data-extracter.firebaseapp.com",
  projectId: "ai-bulk-data-extracter",
  storageBucket: "ai-bulk-data-extracter.firebasestorage.app",
  messagingSenderId: "415680344274",
  appId: "1:415680344274:web:f806df82aa49b6a107510b",
};

const AUTH_STORAGE_KEY = "jotapp_firebase_auth";
const LOCAL_JOTS_KEY = "jotapp_local_jots";
const ENTRIES_COLLECTION = "entries";

let firebaseApp: any = null;
let auth: any = null;
let db: any = null;
let firebaseInitialized = false;

// ─── Types ───────────────────────────────────────────────────────────────────

import { Jot, JotCategory, SyncStatus, StickyNoteColor } from "../types";

export type { Jot, JotCategory, SyncStatus };

export interface TextEntry {
  id: string;
  headline: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  pinned?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: string;
}

// ─── AsyncStorage Helpers ─────────────────────────────────────────────────────

async function getAsyncStorage(): Promise<any> {
  const mod = await import("@react-native-async-storage/async-storage");
  return mod.default;
}

// ─── Local Jots Storage (Offline-First) ───────────────────────────────────────

function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export async function getLocalJots(): Promise<Jot[]> {
  try {
    const AsyncStorage = await getAsyncStorage();
    const raw = await AsyncStorage.getItem(LOCAL_JOTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function saveLocalJots(jots: Jot[]): Promise<void> {
  try {
    const AsyncStorage = await getAsyncStorage();
    await AsyncStorage.setItem(LOCAL_JOTS_KEY, JSON.stringify(jots));
  } catch {}
}

async function clearLocalJots() {
  try {
    const AsyncStorage = await getAsyncStorage();
    await AsyncStorage.removeItem(LOCAL_JOTS_KEY);
  } catch {}
}

// ─── Jot to Firestore Mapping ─────────────────────────────────────────────────

function jotToFirestore(jot: Omit<Jot, "id">): Record<string, any> {
  return {
    userId: jot.userId,
    headline: jot.headline,
    body: jot.body,
    tags: jot.tags,
    category: jot.category,
    isPinned: jot.isPinned,
    isFavorite: jot.isFavorite,
    isNote: jot.isNote ?? false,
    noteColor: jot.noteColor ?? null,
    collaborators: jot.collaborators ?? [],
    createdAt: jot.createdAt,
    updatedAt: jot.updatedAt,
  };
}

function firestoreDocToJot(d: { id: string; data(): any }): Jot {
  const data = d.data();
  return {
    id: d.id,
    userId: data.userId || "",
    headline: data.headline || "",
    body: data.body || data.content || "",
    tags: data.tags || [],
    category: data.category || 'other',
    isPinned: data.isPinned ?? data.pinned ?? false,
    isFavorite: data.isFavorite ?? false,
    isNote: data.isNote ?? false,
    noteColor: data.noteColor || undefined,
    collaborators: data.collaborators || [],
    createdAt: data.createdAt || 0,
    updatedAt: data.updatedAt || 0,
    syncStatus: "synced",
  };
}

// ─── Firebase Init ────────────────────────────────────────────────────────────

const AUTH_MIGRATION_FLAG = "jotapp_migrated_auth_v2";

// Auth listeners who subscribed before initFirebase() resolved. onAuthStateChanged
// must not drop them (a dead no-op meant the restored session never triggered a
// reload, so cloud tasks looked "lost" after restart).
const pendingAuthWaiters: (() => void)[] = [];

export async function initFirebase(): Promise<boolean> {
  if (firebaseInitialized) return true;
  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(FIREBASE_CONFIG);
    } else {
      firebaseApp = getApp();
    }

    // Firebase's own persistence restores the session on launch — no manual
    // credential replay needed. getReactNativePersistence only exists in the
    // RN build (calling it on web throws "is not a function"), so native and
    // web/other platforms initialize auth differently.
    let AsyncStorage: any = null;
    if (Platform.OS === "web") {
      auth = getAuth(firebaseApp);
    } else {
      AsyncStorage = await getAsyncStorage();
      auth = initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
    db = getFirestore(firebaseApp);
    firebaseInitialized = true;
    console.log("[Firebase] Initialized successfully (JS SDK)");

    // Flush any onAuthStateChanged listeners that queued up before init resolved.
    const waiters = pendingAuthWaiters.splice(0, pendingAuthWaiters.length);
    for (const w of waiters) {
      try { w(); } catch {}
    }

    // One-time cleanup: earlier versions stored the raw email+password in
    // AsyncStorage to replay sign-in on launch. Remove any lingering copy.
    try {
      AsyncStorage = AsyncStorage || (await getAsyncStorage());
      const migrated = await AsyncStorage.getItem(AUTH_MIGRATION_FLAG);
      if (!migrated) {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        await AsyncStorage.setItem(AUTH_MIGRATION_FLAG, "true");
      }
    } catch {}

    return true;
  } catch (err) {
    console.warn("[Firebase] Init failed:", err);
    return false;
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function getCurrentUser(): UserProfile | null {
  try {
    if (auth && auth.currentUser) {
      const u = auth.currentUser;
      return {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        photoURL: u.photoURL,
        provider: u.providerData?.[0]?.providerId || "unknown",
      };
    }
  } catch {}
  return null;
}

export function isUserLoggedIn(): boolean {
  try {
    return !!(auth && auth.currentUser);
  } catch {
    return false;
  }
}

export function isAnonymousUser(): boolean {
  try {
    return !!(auth && auth.currentUser && auth.currentUser.isAnonymous);
  } catch {
    return false;
  }
}

export function onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
  let unsubReal: (() => void) | null = null;
  const subscribe = () => {
    if (!auth) return;
    unsubReal = firebaseOnAuthStateChanged(auth, (user) => {
      if (user) {
        callback({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          provider: user.providerData?.[0]?.providerId || "unknown",
        });
      } else {
        callback(null);
      }
    });
  };

  // If init hasn't finished yet, queue the subscription so the restored session
  // (Firebase persists it via AsyncStorage) still reaches this listener.
  if (!auth) {
    pendingAuthWaiters.push(subscribe);
    return () => {
      const i = pendingAuthWaiters.indexOf(subscribe);
      if (i >= 0) pendingAuthWaiters.splice(i, 1);
      if (unsubReal) unsubReal();
    };
  }
  subscribe();
  return () => {
    if (unsubReal) unsubReal();
  };
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (!auth) return { success: false, error: "Firebase not initialized" };
  try {
    const wasAnonymous = !!auth.currentUser && auth.currentUser.isAnonymous;
    const prevUid = auth.currentUser?.uid;

    await createUserWithEmailAndPassword(auth, email, password);

    if (wasAnonymous && prevUid) {
      await migrateLocalJotsToCloud(prevUid);
      await deleteAnonymousFirestoreEntries(prevUid);
    }

    return { success: true };
  } catch (err: any) {
    const code = err?.code || "";
    if (code === "auth/email-already-in-use") return { success: false, error: "Email already in use" };
    if (code === "auth/weak-password") return { success: false, error: "Password must be at least 6 characters" };
    if (code === "auth/invalid-email") return { success: false, error: "Invalid email address" };
    return { success: false, error: err?.message || "Sign up failed" };
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (!auth) return { success: false, error: "Firebase not initialized" };
  try {
    const wasAnonymous = !!auth.currentUser && auth.currentUser.isAnonymous;
    const prevUid = auth.currentUser?.uid;

    await signInWithEmailAndPassword(auth, email, password);
    await migrateOldEntries();

    if (wasAnonymous && prevUid) {
      await migrateLocalJotsToCloud(prevUid);
      await deleteAnonymousFirestoreEntries(prevUid);
    }

    await migrateLocalJotsToCloud(auth.currentUser.uid);

    return { success: true };
  } catch (err: any) {
    const code = err?.code || "";
    if (code === "auth/user-not-found") return { success: false, error: "No account found with this email" };
    if (code === "auth/wrong-password") return { success: false, error: "Incorrect password" };
    if (code === "auth/invalid-email") return { success: false, error: "Invalid email address" };
    if (code === "auth/too-many-requests") return { success: false, error: "Too many attempts. Try again later" };
    if (code === "auth/invalid-credential") return { success: false, error: "Invalid email or password" };
    return { success: false, error: err?.message || "Sign in failed" };
  }
}

export async function signInWithGoogleIdToken(
  idToken: string
): Promise<{ success: boolean; error?: string }> {
  if (!auth) return { success: false, error: "Firebase not initialized" };
  try {
    const wasAnonymous = !!auth.currentUser && auth.currentUser.isAnonymous;
    const prevUid = auth.currentUser?.uid;

    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
    await migrateOldEntries();

    if (wasAnonymous && prevUid) {
      await migrateLocalJotsToCloud(prevUid);
      await deleteAnonymousFirestoreEntries(prevUid);
    }

    await migrateLocalJotsToCloud(auth.currentUser.uid);

    return { success: true };
  } catch (err: any) {
    const code = err?.code || "";
    if (code === "auth/credential-already-in-use") return { success: false, error: "Account already linked to another provider" };
    if (code === "auth/invalid-credential") return { success: false, error: "Invalid Google credential" };
    return { success: false, error: err?.message || "Google sign-in failed" };
  }
}

export async function signInAnonymouslyUser(): Promise<{ success: boolean; error?: string }> {
  if (!auth) return { success: false, error: "Firebase not initialized" };
  try {
    await firebaseSignInAnonymously(auth);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Anonymous sign-in failed" };
  }
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn("[Firebase] signOut failed:", err);
  }
}

export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  if (!auth) return { success: false, error: "Firebase not initialized" };
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (err: any) {
    const code = err?.code || "";
    if (code === "auth/user-not-found") return { success: false, error: "No account found with this email" };
    return { success: false, error: err?.message || "Reset failed" };
  }
}

export async function updateDisplayName(
  displayName: string
): Promise<{ success: boolean; error?: string }> {
  if (!auth || !auth.currentUser) return { success: false, error: "Not signed in" };
  try {
    await updateProfile(auth.currentUser, { displayName });
    return { success: true };
  } catch (err: any) {
    const code = err?.code || "";
    if (code === "auth/invalid-email") return { success: false, error: "Invalid value" };
    return { success: false, error: err?.message || "Update failed" };
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!auth || !auth.currentUser) return { success: false, error: "Not signed in" };
  try {
    if (auth.currentUser.email) {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
    }
    await updatePassword(auth.currentUser, newPassword);
    return { success: true };
  } catch (err: any) {
    const code = err?.code || "";
    if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
      return { success: false, error: "Current password is incorrect" };
    }
    if (code === "auth/weak-password") return { success: false, error: "New password must be at least 6 characters" };
    if (code === "auth/requires-recent-login") {
      return { success: false, error: "Please sign in again and retry" };
    }
    return { success: false, error: err?.message || "Password change failed" };
  }
}

export async function deleteAccount(
  password?: string
): Promise<{ success: boolean; error?: string }> {
  if (!auth || !auth.currentUser) return { success: false, error: "Not signed in" };
  try {
    if (password && auth.currentUser.email) {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
    }
    if (db) {
      const q = query(collection(db, ENTRIES_COLLECTION), where("userId", "==", auth.currentUser.uid));
      const snapshot = await getDocs(q);
      for (const d of snapshot.docs) {
        await deleteDoc(doc(db, ENTRIES_COLLECTION, d.id));
      }
    }
    await clearLocalJots();
    await deleteUser(auth.currentUser);
    return { success: true };
  } catch (err: any) {
    const code = err?.code || "";
    if (code === "auth/requires-recent-login") {
      return { success: false, error: "Please sign in again and retry deletion" };
    }
    if (code === "auth/wrong-password") {
      return { success: false, error: "Incorrect password" };
    }
    return { success: false, error: err?.message || "Account deletion failed" };
  }
}

// ─── Migration: Old Entries → New Jot Format ─────────────────────────────────

function getUid(): string | null {
  try {
    if (auth && auth.currentUser) return auth.currentUser.uid;
  } catch {}
  return null;
}

async function migrateOldEntries(): Promise<void> {
  const uid = getUid();
  if (!uid || !db) return;
  try {
    const q = query(collection(db, ENTRIES_COLLECTION), where("userId", "==", uid));
    const snapshot = await getDocs(q);

    for (const d of snapshot.docs) {
      const data = d.data();
      if (data.body !== undefined) continue;

      const updates: Record<string, any> = {
        body: data.content || "",
        tags: data.tags || [],
        category: data.category || 'other',
        isPinned: data.isPinned ?? data.pinned ?? false,
        isFavorite: data.isFavorite ?? false,
        updatedAt: Date.now(),
      };

      await updateDoc(doc(db, ENTRIES_COLLECTION, d.id), updates);
    }

    console.log("[Firebase] Old entries migration complete");
  } catch (err) {
    console.warn("[Firebase] Migration failed:", err);
  }
}

async function migrateLocalJotsToCloud(targetUserId: string): Promise<void> {
  const localJots = await getLocalJots();
  if (localJots.length === 0 || !db) return;

  try {
    for (const jot of localJots) {
      const firestoreData = jotToFirestore({
        userId: targetUserId,
        headline: jot.headline,
        body: jot.body,
        tags: jot.tags,
        category: jot.category,
        isPinned: jot.isPinned,
        isFavorite: jot.isFavorite,
        isNote: jot.isNote,
        noteColor: jot.noteColor,
        createdAt: jot.createdAt,
        updatedAt: jot.updatedAt,
        syncStatus: "synced",
      });

      if (jot.id.startsWith("local_")) {
        await addDoc(collection(db, ENTRIES_COLLECTION), firestoreData);
      } else {
        const docRef = doc(db, ENTRIES_COLLECTION, jot.id);
        await updateDoc(docRef, { ...firestoreData, updatedAt: Date.now() });
      }
    }

    await clearLocalJots();
    console.log(`[Firebase] Migrated ${localJots.length} local jots to cloud`);
  } catch (err) {
    console.warn("[Firebase] Local jots migration failed:", err);
  }
}

async function deleteAnonymousFirestoreEntries(anonymousUid: string): Promise<void> {
  if (!db) return;
  try {
    const q = query(collection(db, ENTRIES_COLLECTION), where("userId", "==", anonymousUid));
    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, ENTRIES_COLLECTION, d.id));
    }
  } catch {}
}

// ─── Jot CRUD ─────────────────────────────────────────────────────────────────

export async function addJot(
  headline: string,
  body: string,
  options?: { tags?: string[]; category?: JotCategory; isNote?: boolean; noteColor?: StickyNoteColor; collaborators?: string[] }
): Promise<Jot | null> {
  const uid = getUid();
  const isAnon = isAnonymousUser();
  const now = Date.now();

  const jot: Jot = {
    id: generateLocalId(),
    userId: uid || "",
    headline,
    body,
    tags: options?.tags || [],
    category: options?.category || 'other',
    isPinned: false,
    isFavorite: false,
    isNote: options?.isNote ?? false,
    noteColor: options?.noteColor as any,
    collaborators: options?.collaborators?.length ? [...options.collaborators] : [],
    createdAt: now,
    updatedAt: now,
    syncStatus: isAnon || !uid ? "local" : "synced",
  };

  if (isAnon || !uid) {
    const localJots = await getLocalJots();
    localJots.unshift(jot);
    await saveLocalJots(localJots);
    console.log("[Firebase] addJot saved locally (anonymous)");
    return jot;
  }

  if (db) {
    try {
      const firestoreData = jotToFirestore({ ...jot, userId: uid });
      const docRef = await addDoc(collection(db, ENTRIES_COLLECTION), firestoreData);
      console.log("[Firebase] addJot success: id=" + docRef.id);
      return { ...jot, id: docRef.id, userId: uid, syncStatus: "synced" };
    } catch (err) {
      console.warn("[Firebase] addJot Firestore failed, saving locally:", err);
      jot.syncStatus = "pending";
      const localJots = await getLocalJots();
      localJots.unshift(jot);
      await saveLocalJots(localJots);
      return jot;
    }
  }

  jot.syncStatus = "local";
  const localJots = await getLocalJots();
  localJots.unshift(jot);
  await saveLocalJots(localJots);
  return jot;
}

export async function updateJot(
  id: string,
  updates: {
    headline?: string;
    body?: string;
    tags?: string[];
    category?: JotCategory;
    isNote?: boolean;
    noteColor?: StickyNoteColor;
    collaborators?: string[];
  }
): Promise<boolean> {
  const isAnon = isAnonymousUser();
  const uid = getUid();

  if (isAnon || !uid) {
    const localJots = await getLocalJots();
    const idx = localJots.findIndex((j) => j.id === id);
    if (idx === -1) return false;
    localJots[idx] = {
      ...localJots[idx],
      ...updates,
      updatedAt: Date.now(),
      syncStatus: "local",
    };
    await saveLocalJots(localJots);
    return true;
  }

  if (db) {
    try {
      const payload: Record<string, any> = { updatedAt: Date.now() };
      if (updates.headline !== undefined) payload.headline = updates.headline;
      if (updates.body !== undefined) payload.body = updates.body;
      if (updates.tags !== undefined) payload.tags = updates.tags;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.isNote !== undefined) payload.isNote = updates.isNote;
      if (updates.noteColor !== undefined) payload.noteColor = updates.noteColor;
      if (updates.collaborators !== undefined) payload.collaborators = updates.collaborators;
      await updateDoc(doc(db, ENTRIES_COLLECTION, id), payload);
      return true;
    } catch (err) {
      console.warn("[Firebase] updateJot failed:", err);
      return false;
    }
  }

  return false;
}

export async function deleteJot(id: string): Promise<boolean> {
  const isAnon = isAnonymousUser();
  const uid = getUid();

  // Always purge from the local store first — pending/local notes live only
  // there and must disappear even if no cloud write is needed.
  const localJots = await getLocalJots();
  const removedLocally = localJots.some((j) => j.id === id);
  if (removedLocally) {
    await saveLocalJots(localJots.filter((j) => j.id !== id));
  }

  // local_* ids were never written to Firestore, so there is nothing to delete
  // remotely (attempting it would trip the rules on a missing document).
  if (isAnon || !uid || id.startsWith("local_")) {
    return removedLocally;
  }

  if (db) {
    try {
      await deleteDoc(doc(db, ENTRIES_COLLECTION, id));
      return true;
    } catch (err) {
      console.warn("[Firebase] deleteJot failed:", err);
      return removedLocally;
    }
  }

  return removedLocally;
}

export async function getJots(): Promise<Jot[]> {
  const isAnon = isAnonymousUser();
  const uid = getUid();

  if (isAnon || !uid) {
    return getLocalJots();
  }

  const localJots = await getLocalJots();

  if (!db) return localJots;

  try {
    const q = query(collection(db, ENTRIES_COLLECTION), where("userId", "==", uid));
    const snapshot = await getDocs(q);
    const cloudJots = snapshot.docs.map((d) => firestoreDocToJot(d));

    // Tasks shared with this user via collaboration (they appear under the owner's
    // userId, so an array-contains on the current user's email pulls them in).
    const currentEmail = getCurrentUser()?.email?.toLowerCase();
    if (currentEmail) {
      try {
        const sharedQ = query(
          collection(db, ENTRIES_COLLECTION),
          where("collaborators", "array-contains", currentEmail)
        );
        const sharedSnapshot = await getDocs(sharedQ);
        const cloudIds = new Set(cloudJots.map((j) => j.id));
        for (const d of sharedSnapshot.docs) {
          if (!cloudIds.has(d.id)) cloudJots.push(firestoreDocToJot(d));
        }
      } catch (err) {
        console.warn("[Firebase] getJots (shared) failed:", err);
      }
    }
    const localOnlyIds = localJots.filter((j) => !j.id.startsWith("local_")).map((j) => j.id);
    const cloudIds = new Set(cloudJots.map((j) => j.id));
    const pendingLocal = localJots.filter((j) => j.id.startsWith("local_") || !cloudIds.has(j.id));

    const all = [...cloudJots, ...pendingLocal];
    all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return all;
  } catch (err) {
    console.warn("[Firebase] getJots failed:", err);
    return localJots;
  }
}

export async function togglePinJot(id: string): Promise<boolean> {
  const isAnon = isAnonymousUser();

  if (isAnon || !getUid()) {
    const localJots = await getLocalJots();
    const idx = localJots.findIndex((j) => j.id === id);
    if (idx === -1) return false;
    localJots[idx].isPinned = !localJots[idx].isPinned;
    localJots[idx].updatedAt = Date.now();
    await saveLocalJots(localJots);
    return true;
  }

  if (!db) return false;
  try {
    const jot = (await getJots()).find((j) => j.id === id);
    if (!jot) return false;
    const newPinned = !jot.isPinned;
    await updateDoc(doc(db, ENTRIES_COLLECTION, id), {
      isPinned: newPinned,
      updatedAt: Date.now(),
    });
    return true;
  } catch (err) {
    console.warn("[Firebase] togglePinJot failed:", err);
    return false;
  }
}

export async function toggleFavoriteJot(id: string): Promise<boolean> {
  const isAnon = isAnonymousUser();

  if (isAnon || !getUid()) {
    const localJots = await getLocalJots();
    const idx = localJots.findIndex((j) => j.id === id);
    if (idx === -1) return false;
    localJots[idx].isFavorite = !localJots[idx].isFavorite;
    localJots[idx].updatedAt = Date.now();
    await saveLocalJots(localJots);
    return true;
  }

  if (!db) return false;
  try {
    const jot = (await getJots()).find((j) => j.id === id);
    if (!jot) return false;
    const newFav = !jot.isFavorite;
    await updateDoc(doc(db, ENTRIES_COLLECTION, id), {
      isFavorite: newFav,
      updatedAt: Date.now(),
    });
    return true;
  } catch (err) {
    console.warn("[Firebase] toggleFavoriteJot failed:", err);
    return false;
  }
}

// ─── Backward-Compatible Entry CRUD ───────────────────────────────────────────

export async function getEntries(uidOverride?: string): Promise<TextEntry[]> {
  const uid = uidOverride || getUid();
  if (!uid || !db) return [];
  try {
    const q = query(collection(db, ENTRIES_COLLECTION), where("userId", "==", uid));
    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        headline: data.headline || "",
        content: data.body || data.content || "",
        createdAt: data.createdAt || 0,
        updatedAt: data.updatedAt || 0,
        userId: data.userId || uid,
        pinned: data.isPinned ?? data.pinned ?? false,
      } as TextEntry;
    });
    entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return entries;
  } catch (err) {
    console.warn("[Firebase] getEntries failed:", err);
    return [];
  }
}

export async function addEntry(
  headline: string,
  content: string,
  uidOverride?: string
): Promise<TextEntry | null> {
  const jot = await addJot(headline, content, { tags: [], category: 'other' });
  if (!jot) return null;
  return {
    id: jot.id,
    headline: jot.headline,
    content: jot.body,
    createdAt: jot.createdAt,
    updatedAt: jot.updatedAt,
    userId: jot.userId,
    pinned: jot.isPinned,
  };
}

export async function updateEntry(
  id: string,
  headline: string,
  content: string
): Promise<boolean> {
  return updateJot(id, { headline, body: content });
}

export async function togglePinEntry(id: string, pinned: boolean): Promise<boolean> {
  const isAnon = isAnonymousUser();
  if (isAnon || !getUid()) {
    const localJots = await getLocalJots();
    const idx = localJots.findIndex((j) => j.id === id);
    if (idx === -1) return false;
    localJots[idx].isPinned = pinned;
    localJots[idx].updatedAt = Date.now();
    await saveLocalJots(localJots);
    return true;
  }
  if (!db) return false;
  try {
    await updateDoc(doc(db, ENTRIES_COLLECTION, id), {
      isPinned: pinned,
      pinned: pinned,
      updatedAt: Date.now(),
    });
    return true;
  } catch (err) {
    console.warn("[Firebase] togglePinEntry failed:", err);
    return false;
  }
}

export async function deleteEntry(id: string): Promise<boolean> {
  return deleteJot(id);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function isFirebaseAvailable(): boolean {
  return firebaseInitialized;
}

// Accessor so other services (referral, etc.) can issue their own Firestore
// reads/writes through the same initialized instance.
export function getDb(): any {
  return db;
}
