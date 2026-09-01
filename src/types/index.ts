export interface Jot {
  id: string;
  userId: string;
  headline: string;
  body: string;
  tags: string[];
  category: JotCategory;
  isPinned: boolean;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
}

export type JotCategory = 'personal' | 'work' | 'ideas' | 'study' | 'shopping' | 'quotes' | 'other';

export const CATEGORIES: { key: JotCategory; label: string; icon: string }[] = [
  { key: 'personal', label: 'Personal', icon: 'person-outline' },
  { key: 'work', label: 'Work', icon: 'briefcase-outline' },
  { key: 'ideas', label: 'Ideas', icon: 'bulb-outline' },
  { key: 'study', label: 'Study', icon: 'school-outline' },
  { key: 'shopping', label: 'Shopping', icon: 'cart-outline' },
  { key: 'quotes', label: 'Quotes', icon: 'chatbubble-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export const CATEGORY_COLORS: Record<JotCategory, string> = {
  personal: '#6C63FF',
  work: '#FF6B6B',
  ideas: '#FFD93D',
  study: '#4ECDC4',
  shopping: '#FF8A5C',
  quotes: '#A8E6CF',
  other: '#888888',
};

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'pending' | 'error';

export type ShareStyle = 'minimal' | 'dark' | 'paper' | 'gradient' | 'bold' | 'soft';

export type SortOption = 'newest' | 'oldest' | 'az' | 'za' | 'recently_updated' | 'pinned_first';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: string;
  isPro: boolean;
  jotCount: number;
  createdAt: number;
}

export interface AppSettings {
  isDark: boolean;
  hasCompletedOnboarding: boolean;
  hasSeenGuide: boolean;
  defaultCategory: JotCategory;
  showBranding: boolean;
  lastReviewPrompt: number;
}

export const FREE_JOT_LIMIT = 50;

export interface ReferralData {
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  activatedReferrals: number;
}
