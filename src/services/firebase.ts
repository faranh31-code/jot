import { Platform } from "react-native";

const FIREBASE_CONFIG = {
  apiKey: "REPLACE_WITH_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_FIREBASE_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_FIREBASE_PROJECT_ID",
  storageBucket: "REPLACE_WITH_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_FIREBASE_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_FIREBASE_APP_ID",
};

let firebaseApp: any = null;
let firestore: any = null;

export interface TextEntry {
  id: string;
  headline: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
}

const ENTRIES_COLLECTION = "entries";
const USER_ID_KEY = "textsaver_user_id";

function getUserId(): string {
  if (Platform.OS === "web") {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  }
  return "local_user";
}

export async function initFirebase(): Promise<boolean> {
  try {
    const app = await import("@react-native-firebase/app");
    const fs = await import("@react-native-firebase/firestore");

    const defaultApp = app.default;
    if (defaultApp?.apps?.length === 0) {
      defaultApp.initializeApp(FIREBASE_CONFIG);
    }

    firebaseApp = defaultApp;
    firestore = fs.default;
    console.log("[Firebase] Initialized successfully");
    return true;
  } catch {
    console.warn("[Firebase] Native module not available. Running in offline mode.");
    return false;
  }
}

export async function getEntries(): Promise<TextEntry[]> {
  if (!firestore) {
    console.warn("[Firebase] Firestore not available");
    return [];
  }

  try {
    const userId = getUserId();
    const snapshot = await firestore
      .collection(ENTRIES_COLLECTION)
      .where("userId", "==", userId)
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
  if (!firestore) {
    console.warn("[Firebase] Firestore not available");
    return null;
  }

  try {
    const userId = getUserId();
    const now = Date.now();
    const docRef = await firestore.collection(ENTRIES_COLLECTION).add({
      headline,
      content,
      createdAt: now,
      updatedAt: now,
      userId,
    });

    return {
      id: docRef.id,
      headline,
      content,
      createdAt: now,
      updatedAt: now,
      userId,
    };
  } catch (err) {
    console.warn("[Firebase] addEntry failed:", err);
    return null;
  }
}

export async function updateEntry(id: string, headline: string, content: string): Promise<boolean> {
  if (!firestore) {
    console.warn("[Firebase] Firestore not available");
    return false;
  }

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
  if (!firestore) {
    console.warn("[Firebase] Firestore not available");
    return false;
  }

  try {
    await firestore.collection(ENTRIES_COLLECTION).doc(id).delete();
    return true;
  } catch (err) {
    console.warn("[Firebase] deleteEntry failed:", err);
    return false;
  }
}

export function isFirebaseAvailable(): boolean {
  return firestore !== null;
}
