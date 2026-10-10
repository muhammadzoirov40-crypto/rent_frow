import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { geocode } from '../../api';
import { TAJIKISTAN_CENTER, cityCenter, isValidCoord } from '../../utils/geo';

// Same CDN marker images as LocationMap - Leaflet resolves them relative to
// its CSS, which Vite does not bundle, and this component may be opened before
// any other map has been on screen.
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  /** Used to open the map on the right city before a pin exists. */
  cityName?: string | null;
  onChange: (coords: { latitude: number | null; longitude: number | null }) => void;
}

/**
 * Where the owner says the listing really is. Three ways in: search the
 * address (through our own geocoding endpoint, so no geocoder key or rate
 * limit ever touches the browser), click the map, or drag the pin. The value
 * lives in the form, not here - this component only reports upwards, which is
 * why clearing it is just as possible as setting it.
 */
export default function LocationPicker({
  latitude,
  longitude,
  cityName,
  onChange,
}: LocationPickerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const hasPin = isValidCoord(latitude, longitude);

  // The map itself is built once: an existing pin, else the city, else the
  // whole country - the same ladder LocationMap shows a visitor.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start: [number, number] = hasPin
      ? [latitude as number, longitude as number]
      : (cityCenter(cityName) ?? TAJIKISTAN_CENTER);
    const map = L.map(containerRef.current, {
      center: start,
      zoom: hasPin ? 16 : 11,
      scrollWheelZoom: false,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // The picker is mounted once per form; remount happens on navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in step with the value, wherever the value came from:
  // a prefilled listing, a search result, the map itself, a drag - or the
  // clear button, which simply takes the marker away.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!isValidCoord(latitude, longitude)) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const pos: [number, number] = [latitude as number, longitude as number];
    if (!markerRef.current) {
      markerRef.current = L.marker(pos, { draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const ll = markerRef.current?.getLatLng();
        if (ll) onChange({ latitude: ll.lat, longitude: ll.lng });
      });
    } else {
      markerRef.current.setLatLng(pos);
    }
    map.setView(pos, Math.max(map.getZoom(), 15));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  // Choosing a city moves the map to it. The build above only ever ran once,
  // on mount, so picking Душанбе after Истаравшан left the visitor looking at
  // the wrong part of the country with no pin to explain why. A pin wins: if
  // they have already said where the listing is, that is the place the map
  // has to keep showing.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (isValidCoord(latitude, longitude)) return;
    const center = cityCenter(cityName);
    if (center) map.setView(center, 11);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityName]);

  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 4 || searching) return;
    setSearching(true);
    try {
      const hit = await geocode.search(q);
      if (hit) {
        onChange({ latitude: hit.latitude, longitude: hit.longitude });
      } else {
        // Not on the map is a normal answer, not a failure: the hint under
        // the map already tells them to click the spot instead.
        toast.error(t('createListing.pinNotFound'));
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2" data-testid="location-picker">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder={t('createListing.pinSearchPlaceholder')}
          className="flex-1 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.3)] focus:border-[var(--accent)] outline-none transition"
          data-testid="pin-search-input"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={searching || query.trim().length < 4}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white transition"
          data-testid="pin-search-button"
        >
          {searching ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          {t('createListing.pinSearch')}
        </button>
      </div>

      {/* z-0 + relative is what every map here does, and it is not cosmetic:
          Leaflet paints its panes at 400-1000; without a stacking context of
          its own the container they would land on top of every modal. */}
      <div
        ref={containerRef}
        style={{ height: '16rem' }}
        className="relative z-0 w-full rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden bg-gray-100 dark:bg-[#12141a]"
        data-testid="pin-map"
      />

      <div className="flex items-center justify-between gap-2 min-h-[1.5rem]">
        {hasPin ? (
          <span
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"
            data-testid="pin-set"
          >
            <MapPin size={14} />
            {t('createListing.pinSet')}
          </span>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <MapPin size={14} className="shrink-0" />
            {t('createListing.pinHint')}
          </p>
        )}
        {hasPin && (
          <button
            type="button"
            onClick={() => onChange({ latitude: null, longitude: null })}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            data-testid="pin-clear-button"
          >
            <X size={14} />
            {t('createListing.pinClear')}
          </button>
        )}
      </div>
    </div>
  );
}
