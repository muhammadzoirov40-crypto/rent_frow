/** Approximate centres of Tajikistan's cities.
 *
 * A listing carries `latitude`/`longitude` only when its owner pinned it on a
 * map — most do not. Without a fallback the map would sit on an empty country,
 * so a pin that lands on the right city is still useful information.
 *
 * Keys are lower-case city names; the common Russian/English spellings are
 * aliases so a listing whose city came from another translation still resolves.
 */
export const CITY_CENTERS: Record<string, [number, number]> = {
  // Tajik
  'душанбе': [38.5598, 68.787],
  'хуҷанд': [40.285, 69.627],
  'бохтар': [37.838, 68.783],
  'кӯлоб': [37.92, 69.61],
  'kulob': [37.92, 69.61],
  'истаравшан': [39.91, 69.13],
  'конибодом': [40.29, 70.13],
  'турсунзода': [38.51, 68.23],
  'панҷакент': [39.5, 67.61],
  'хоруғ': [37.47, 71.55],
  'мурғоб': [38.17, 74.21],
  'данғара': [38.11, 69.34],
  'ваҳдат': [38.56, 69.02],
  'ҳисор': [38.52, 68.55],
  'регар': [39.05, 68.57],
  'айнӣ': [39.05, 68.57],
  'шаҳристон': [39.6, 68.86],
  'файзобод': [39.06, 70.16],
  'шуғнон': [37.56, 71.5],
  'ишкошим': [36.71, 71.62],
  'балҷувон': [38.37, 69.78],
  'норак': [38.39, 69.32],
  'халқовор': [37.48, 71.28],
  'ҷарруғ': [38.37, 68.95],
  // Russian / English aliases
  'худжанд': [40.285, 69.627],
  'куляб': [37.92, 69.61],
  'курган-тюбе': [37.83, 69.28],
  'пянджикент': [39.5, 67.61],
  'хорог': [37.47, 71.55],
  'мургаб': [38.17, 74.21],
  'дангара': [38.11, 69.34],
  'вахдат': [38.56, 69.02],
  'хисор': [38.52, 68.55],
  'dushanbe': [38.5598, 68.787],
  'khujand': [40.285, 69.627],
  'bokhtar': [37.838, 68.783],
};

/** Whole-country centre — the last resort when neither coordinates nor a
 *  known city are available. Same starting point MapView uses. */
export const TAJIKISTAN_CENTER: [number, number] = [38.86, 71.27];

/** Centre of `name`, or null when we do not know that city. */
export function cityCenter(name?: string | null): [number, number] | null {
  const key = (name ?? '').trim().toLowerCase();
  return key ? (CITY_CENTERS[key] ?? null) : null;
}

/** True when a pair of values is a plausibly placeable coordinate. */
export function isValidCoord(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}
