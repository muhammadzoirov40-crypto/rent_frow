const STORAGE_KEY = 'renthub_recently_viewed';
const MAX_ITEMS = 12;

export interface RecentlyViewedItem {
  id: number;
  title: string;
  price: number;
  price_unit: string;
  city_name: string | null;
  district_name?: string | null;
  primary_image: string | null;
  views_count?: number;
  average_rating?: number;
  rating_count?: number;
  is_verified?: boolean;
  available?: boolean;
  created_at: string;
  is_favorited: boolean;
}

function read(): RecentlyViewedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: RecentlyViewedItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* quota / private mode — silently ignore */
  }
}

/** Stores a lightweight snapshot of the listing the user just opened. */
export function rememberViewed(item: RecentlyViewedItem): void {
  if (!item?.id) return;
  const next = [item, ...read().filter((i) => i.id !== item.id)];
  write(next);
}

/**
 * Reads the cached history. `revision` is an optional counter a component can
 * bump to force a re-read after the history changes.
 */
export function getRecentlyViewed(_revision = 0): RecentlyViewedItem[] {
  return read();
}

export function clearRecentlyViewed(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
