import { Platform } from "react-native";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD0L5qly0KIhAZilFUb2uJzmhceGXhIRZQ",
  authDomain: "ai-bulk-data-extracter.firebaseapp.com",
  projectId: "ai-bulk-data-extracter",
  storageBucket: "ai-bulk-data-extracter.firebasestorage.app",
  messagingSenderId: "574020111117",
  appId: "1:574020111117:web:e1324b389fd3ec27eb3e44",
};

export const FIREBASE_WEB_CONFIG = FIREBASE_CONFIG;

let firebaseApp: any = null;
let firestore: any = null;
let auth: any = null;
let firebaseInitialized = false;

export interface TextEntry {
  id: string;
  headline: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: string;
}

const ENTRIES_COLLECTION = "entries";

function getUid(): string | null {
  try {
    if (auth && auth.currentUser) {
      return auth.currentUser.uid;
    }
  } catch {}
  return null;
}

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

export function onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return auth.onAuthStateChanged((user: any) => {
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
}

export async function initFirebase(): Promise<boolean> {
  if (firebaseInitialized) return true;
  try {
    const firebaseAppMod = await import("@react-native-firebase/app");
    const fs = await import("@react-native-firebase/firestore");
    const authMod = await import("@react-native-firebase/auth");

    const defaultApp = firebaseAppMod.default;
    if (defaultApp?.apps?.length === 0) {
      defaultApp.initializeApp(FIREBASE_CONFIG);
    }

    firebaseApp = defaultApp;
    firestore = fs.default;
    auth = authMod.default;
    firebaseInitialized = true;
    console.log("[Firebase] Initialized successfully");
    return true;
  } catch {
    console.warn("[Firebase] Native module not available. Running in degraded mode.");
    return false;
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (!auth) return { success: false, error: "Firebase not initialized" };
  try {
    await auth().createUserWithEmailAndPassword(email, password);
    return { success: true };
  } catch (err: any) {
    const msg = err?.message || "Sign up failed";
    if (msg.includes("email-already-in-use")) return { success: false, error: "Email already in use" };
    if (msg.includes("weak-password")) return { success: false, error: "Password must be at least 6 characters" };
    if (msg.includes("invalid-email")) return { success: false, error: "Invalid email address" };
    return { success: false, error: msg };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (!auth) return { success: false, error: "Firebase not initialized" };
  try {
    await auth().signInWithEmailAndPassword(email, password);
    return { success: true };
  } catch (err: any) {
    const msg = err?.message || "Sign in failed";
    if (msg.includes("user-not-found")) return { success: false, error: "No account found with this email" };
    if (msg.includes("wrong-password")) return { success: false, error: "Incorrect password" };
    if (msg.includes("invalid-email")) return { success: false, error: "Invalid email address" };
    if (msg.includes("too-many-requests")) return { success: false, error: "Too many attempts. Try again later" };
    return { success: false, error: msg };
  }
}

export async function signInWithGoogle(idToken: string): Promise<{ success: boolean; error?: string }> {
  if (!auth) return { success: false, error: "Firebase not initialized" };
  try {
    const credential = auth.GoogleAuthProvider.credential(idToken);
    await auth().signInWithCredential(credential);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Google sign-in failed" };
  }
}

export async function signInWithApple(idToken: string, nonce: string): Promise<{ success: boolean; error?: string }> {
  if (!auth) return { success: false, error: "Firebase not initialized" };
  try {
    const credential = auth.AppleAuthProvider.credential(idToken, nonce);
    await auth().signInWithCredential(credential);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Apple sign-in failed" };
  }
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  try {
    await auth().signOut();
  } catch (err) {
    console.warn("[Firebase] signOut failed:", err);
  }
}

export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  if (!auth) return { success: false, error: "Firebase not initialized" };
  try {
    await auth().sendPasswordResetEmail(email);
    return { success: true };
  } catch (err: any) {
    const msg = err?.message || "Reset failed";
    if (msg.includes("user-not-found")) return { success: false, error: "No account found with this email" };
    return { success: false, error: msg };
  }
}

export async function getEntries(): Promise<TextEntry[]> {
  const uid = getUid();
  if (!uid) return [];
  if (!firestore) return [];

  try {
    const snapshot = await firestore
      .collection(ENTRIES_COLLECTION)
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as TextEntry[];
  } catch (err) {
    console.warn("[Firebase] getEntries failed:", err);
    return [];
  }
}

export async function addEntry(headline: string, content: string): Promise<TextEntry | null> {
  const uid = getUid();
  if (!uid || !firestore) return null;

  try {
    const now = Date.now();
    const docRef = await firestore.collection(ENTRIES_COLLECTION).add({
      headline,
      content,
      createdAt: now,
      updatedAt: now,
      userId: uid,
    });

    return { id: docRef.id, headline, content, createdAt: now, updatedAt: now, userId: uid };
  } catch (err) {
    console.warn("[Firebase] addEntry failed:", err);
    return null;
  }
}

export async function updateEntry(id: string, headline: string, content: string): Promise<boolean> {
  if (!firestore) return false;
  try {
    await firestore.collection(ENTRIES_COLLECTION).doc(id).update({
      headline,
      content,
      updatedAt: Date.now(),
    });
    return true;
  } catch (err) {
    console.warn("[Firebase] updateEntry failed:", err);
    return false;
  }
}

export async function deleteEntry(id: string): Promise<boolean> {
  if (!firestore) return false;
  try {
    await firestore.collection(ENTRIES_COLLECTION).doc(id).delete();
    return true;
  } catch (err) {
    console.warn("[Firebase] deleteEntry failed:", err);
    return false;
  }
}

export function isFirebaseAvailable(): boolean {
  return firebaseInitialized;
}
