import { Jot } from '../types';

export interface DayBucket {
  label: string; // e.g. "Mon"
  date: string; // ISO date (yyyy-mm-dd), for keying
  count: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Buckets jots by the day they were created, for the last `days` days
// (including today), oldest first — enough to drive a simple bar chart.
export function getJotsCreatedByDay(jots: Jot[], days: number = 14): DayBucket[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const buckets: DayBucket[] = [];
  const keyToIndex: Record<string, number> = {};

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * DAY_MS);
    const key = dayKey(date.getTime());
    keyToIndex[key] = buckets.length;
    buckets.push({
      label: WEEKDAY_LABELS[date.getDay()],
      date: key,
      count: 0,
    });
  }

  for (const jot of jots) {
    const key = dayKey(jot.createdAt);
    const index = keyToIndex[key];
    if (index !== undefined) {
      buckets[index].count += 1;
    }
  }

  return buckets;
}
