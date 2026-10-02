/**
 * Runtime accent (theme colour) resolution.
 *
 * The eight presets live in `index.css` as `html[data-accent="…"]` rules. A
 * user-picked colour cannot — there is no stylesheet rule for it — so instead
 * we compute the whole accent token set from the chosen hex and set it inline
 * on <html>. Inline custom properties win over the stylesheet, which is exactly
 * what we need, and every `var(--accent*)` usage across the site picks it up
 * without touching a single component.
 *
 * The computed tokens are also persisted so the tiny pre-paint script in
 * `index.html` can restore them before React boots, with no colour maths
 * duplicated there.
 */

export const ACCENT_VARS = [
  '--accent',
  '--accent-hover',
  '--accent-light',
  '--accent-dark',
  '--accent-rgb',
] as const;

export type AccentVars = Record<(typeof ACCENT_VARS)[number], string>;

export const ACCENT_VARS_STORAGE = 'accentVars';

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** True when `value` is a raw colour (as produced by `<input type="color">`). */
export function isCustomAccent(value: string): boolean {
  return HEX_RE.test(value);
}

/** Accepts `#rgb` or `#rrggbb`; returns a normalised 6-digit hex, or ''. */
export function normalizeHex(value: string): string {
  const v = (value || '').trim().toLowerCase();
  if (!HEX_RE.test(v)) return '';
  if (v.length === 4) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return v;
}

function toRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex).slice(1);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const scale = (rgb: number[], f: number): [number, number, number] => [
  clamp(rgb[0] * f),
  clamp(rgb[1] * f),
  clamp(rgb[2] * f),
];
const toHex = (rgb: number[]) =>
  `#${rgb.map((n) => n.toString(16).padStart(2, '0')).join('')}`;

/**
 * Derives the five accent tokens for an arbitrary colour.
 * Returns `null` when `value` is not a colour (i.e. it is a preset id).
 */
export function buildAccentVars(value: string): AccentVars | null {
  const hex = normalizeHex(value);
  if (!hex) return null;
  const rgb = toRgb(hex);
  return {
    '--accent': hex,
    '--accent-hover': toHex(scale(rgb, 0.9)),
    '--accent-light': toHex(scale(rgb, 1.12)),
    '--accent-dark': toHex(scale(rgb, 0.78)),
    '--accent-rgb': `${rgb[0]} ${rgb[1]} ${rgb[2]}`,
  };
}

/** Writes the tokens onto <html> and persists them for the pre-paint script. */
export function applyAccentVars(vars: AccentVars): void {
  const root = document.documentElement;
  for (const key of ACCENT_VARS) root.style.setProperty(key, vars[key]);
  try {
    localStorage.setItem(ACCENT_VARS_STORAGE, JSON.stringify(vars));
  } catch {
    /* storage unavailable (private mode) — colour still applies for this session */
  }
}

/** Drops the inline tokens so the `data-accent` stylesheet rules take over again. */
export function clearAccentVars(): void {
  const root = document.documentElement;
  for (const key of ACCENT_VARS) root.style.removeProperty(key);
  try {
    localStorage.removeItem(ACCENT_VARS_STORAGE);
  } catch {
    /* ignore */
  }
}

/** Reads back the tokens persisted by `applyAccentVars`, if they are intact. */
export function readStoredAccentVars(): AccentVars | null {
  try {
    const raw = localStorage.getItem(ACCENT_VARS_STORAGE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return ACCENT_VARS.every((key) => typeof parsed[key] === 'string')
      ? (parsed as unknown as AccentVars)
      : null;
  } catch {
    return null;
  }
}
