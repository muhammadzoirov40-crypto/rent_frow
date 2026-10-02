import { useCallback, useEffect, useState } from 'react';

interface Coords {
  lat: number;
  lng: number;
}

const STORAGE_KEY = 'renthub_coords';
const CACHE_TTL_MS = 30 * 60 * 1000;

interface Cached extends Coords {
  saved_at: number;
}

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (typeof parsed?.lat !== 'number' || typeof parsed?.lng !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Opt-in geolocation for the "near you" discovery sections.
 * Coordinates are cached for 30 minutes so we do not prompt on every visit.
 */
export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'denied' | 'unsupported'>('idle');

  useEffect(() => {
    const cached = readCache();
    if (cached && Date.now() - cached.saved_at < CACHE_TTL_MS) {
      setCoords({ lat: cached.lat, lng: cached.lng });
    }
  }, []);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        setStatus('idle');
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...next, saved_at: Date.now() }),
          );
        } catch {
          /* ignore storage failures */
        }
      },
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: CACHE_TTL_MS },
    );
  }, []);

  const clear = useCallback(() => {
    setCoords(null);
    setStatus('idle');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { coords, status, request, clear };
}
