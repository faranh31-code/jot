import { Platform } from "react-native";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD0L5qly0KIhAZilFUb2uJzmhceGXhIRZQ",
  authDomain: "ai-bulk-data-extracter.firebaseapp.com",
  projectId: "ai-bulk-data-extracter",
  storageBucket: "ai-bulk-data-extracter.firebasestorage.app",
  messagingSenderId: "574020111117",
  appId: "1:574020111117:web:e1324b389fd3ec27eb3e44",
};

let firebaseApp: any = null;
let auth: any = null;
let db: any = null;
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

export async function initFirebase(): Promise<boolean> {
  if (firebaseInitialized) return true;
  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(FIREBASE_CONFIG);
    } else {
      firebaseApp = getApp();
    }

    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    firebaseInitialized = true;
    console.log("[Firebase] Initialized successfully (JS SDK)");
    return true;
  } catch (err) {
    console.warn("[Firebase] Init failed:", err);
    return false;
  }
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
  return firebaseOnAuthStateChanged(auth, (user) => {
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

export async function signUpWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (!auth) return { success: false, error: "Firebase not initialized" };
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    return { success: true };
  } catch (err: any) {
    const code = err?.code || "";
    if (code === "auth/email-already-in-use") return { success: false, error: "Email already in use" };
    if (code === "auth/weak-password") return { success: false, error: "Password must be at least 6 characters" };
    if (code === "auth/invalid-email") return { success: false, error: "Invalid email address" };
    return { success: false, error: err?.message || "Sign up failed" };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (!auth) return { success: false, error: "Firebase not initialized" };
  try {
    await signInWithEmailAndPassword(auth, email, password);
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

export async function signInWithGoogle(idToken: string): Promise<{ success: boolean; error?: string }> {
  if (!auth) return { success: false, error: "Firebase not initialized" };
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Google sign-in failed" };
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

function getUid(): string | null {
  try {
    if (auth && auth.currentUser) return auth.currentUser.uid;
  } catch {}
  return null;
}

export async function getEntries(): Promise<TextEntry[]> {
  const uid = getUid();
  if (!uid || !db) return [];
  try {
    const q = query(collection(db, ENTRIES_COLLECTION), where("userId", "==", uid), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as TextEntry[];
  } catch (err) {
    console.warn("[Firebase] getEntries failed:", err);
    return [];
  }
}

export async function addEntry(headline: string, content: string): Promise<TextEntry | null> {
  const uid = getUid();
  if (!uid || !db) return null;
  try {
    const now = Date.now();
    const docRef = await addDoc(collection(db, ENTRIES_COLLECTION), {
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
  if (!db) return false;
  try {
    await updateDoc(doc(db, ENTRIES_COLLECTION, id), {
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
  if (!db) return false;
  try {
    await deleteDoc(doc(db, ENTRIES_COLLECTION, id));
    return true;
  } catch (err) {
    console.warn("[Firebase] deleteEntry failed:", err);
    return false;
  }
}

export function isFirebaseAvailable(): boolean {
  return firebaseInitialized;
}
