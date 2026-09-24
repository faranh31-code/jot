export interface Jot {
  id: string;
  userId: string;
  headline: string;
  body: string;
  tags: string[];
  category: JotCategory;
  isPinned: boolean;
  isFavorite: boolean;
  isNote?: boolean;
  noteColor?: StickyNoteColor;
  collaborators?: string[];
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

// Friendly, user-facing labels shown on each note card.
export const CATEGORY_LABELS: Record<JotCategory, string> = {
  personal: 'Personal Work',
  work: 'Work',
  ideas: 'Ideas',
  study: 'Study',
  shopping: 'Shopping',
  quotes: 'Quotes',
  other: 'Other',
};

export type StickyNoteColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange' | 'lavender';

export const DEFAULT_NOTE_COLOR: StickyNoteColor = 'yellow';

// Friendly, user-facing names for each sticky-note color.
export const STICKY_NOTE_NAMES: Record<StickyNoteColor, string> = {
  yellow: 'Sunshine',
  green: 'Mint',
  blue: 'Sky',
  pink: 'Blossom',
  orange: 'Peach',
  lavender: 'Lilac',
};

// Classic sticky-note palette with an ink (text) color tuned for contrast
// against each paper color — sticky notes keep their palette in both themes.
export const STICKY_NOTE_COLORS: Record<StickyNoteColor, { paper: string; ink: string; accent: string }> = {
  yellow: { paper: '#FDE68A', ink: '#4A3B00', accent: '#E9C64B' },
  green: { paper: '#BBF7D0', ink: '#14532D', accent: '#7BD9A2' },
  blue: { paper: '#BFDBFE', ink: '#1E3A8A', accent: '#8DB5F3' },
  pink: { paper: '#FBCFE8', ink: '#6B0F3A', accent: '#F19FC8' },
  orange: { paper: '#FED7AA', ink: '#7C2D12', accent: '#F5B477' },
  lavender: { paper: '#E9D5FF', ink: '#4C1D95', accent: '#C9A6F2' },
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
