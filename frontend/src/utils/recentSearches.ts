const STORAGE_KEY = 'renthub_recent_searches';
const MAX_ITEMS = 6;

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  } catch {
    return [];
  }
}

function write(items: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* storage unavailable (private mode / quota) — ignore */
  }
}

/** Most-recent-first list of the user's own search terms. */
export function getRecentSearches(): string[] {
  return read();
}

/** Push a term to the top of the list, de-duplicated, capped at `MAX_ITEMS`. */
export function rememberSearch(term: string): void {
  const value = term.trim();
  if (!value) return;
  const next = [value, ...read().filter((v) => v.toLowerCase() !== value.toLowerCase())];
  write(next);
}

/** Remove a single term (used by the ✕ on each recent-search chip). */
export function forgetSearch(term: string): string[] {
  const next = read().filter((v) => v !== term);
  write(next);
  return next;
}

export function clearRecentSearches(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
