const MAX_LEN = 30;
const STORAGE_KEY = 'renthub_nav_paths';

let paths: string[] = load();

function load(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((p) => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

function save() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
  } catch {
    /* ignore */
  }
}

export function recordPath(path: string) {
  const clean = path.split('?')[0];
  if (paths[paths.length - 1] === clean) return;
  paths.push(clean);
  if (paths.length > MAX_LEN) paths.shift();
  save();
}

export function previousPath(current: string): string | null {
  const clean = current.split('?')[0];
  if (!paths.length) return null;
  if (paths[paths.length - 1] === clean) {
    return paths.length > 1 ? paths[paths.length - 2] : null;
  }
  return paths[paths.length - 1];
}
