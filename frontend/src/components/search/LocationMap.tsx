import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, ExternalLink } from 'lucide-react';
import { TAJIKISTAN_CENTER, cityCenter, isValidCoord } from '../../utils/geo';

// Leaflet resolves its default marker images relative to its CSS, which Vite
// does not bundle — point them at the CDN copies shipped with the package.
// Setting them here too means the map works whether or not SearchPage's
// MapView happens to be loaded already.
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface LocationMapProps {
  latitude?: number | null;
  longitude?: number | null;
  cityName?: string | null;
  districtName?: string | null;
  address?: string | null;
  title?: string;
  height?: string;
}

/**
 * Where this listing is. An exact pin when the owner placed one, the centre of
 * its city when they did not, and the whole country as a last resort — the
 * note under the map says which of the three the visitor is looking at, so an
 * approximate pin is never mistaken for an exact one.
 */
export default function LocationMap({
  latitude,
  longitude,
  cityName,
  districtName,
  address,
  title,
  height = '18rem',
}: LocationMapProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const hasCoords = isValidCoord(latitude, longitude);
  const cityPin = cityCenter(cityName);
  const center: [number, number] = hasCoords
    ? [latitude as number, longitude as number]
    : cityPin ?? TAJIKISTAN_CENTER;
  const placeable = hasCoords || cityPin !== null;

  const lines = [title, address, districtName, cityName].filter(Boolean) as string[];
  const osmHref =
    `https://www.openstreetmap.org/?mlat=${center[0]}&mlon=${center[1]}` +
    `#map=${hasCoords ? 15 : cityPin ? 12 : 7}/${center[0]}/${center[1]}`;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom: hasCoords ? 15 : cityPin ? 12 : 7,
      scrollWheelZoom: false,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    if (placeable) {
      L.marker(center)
        .addTo(map)
        .bindPopup(
          lines
            .map((line, i) => (i === 0 ? `<b>${line}</b>` : line))
            .join('<br/>'),
        );
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // The listing is fixed for the life of the card; a new listing remounts us.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6"
      data-testid="listing-location"
    >
      <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2 mb-3">
        <MapPin size={20} className="text-[var(--accent)]" />
        {t('listing.location')}
      </h2>

      {lines.length > 1 && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {lines.slice(1).join(', ')}
        </p>
      )}

      <div
        ref={containerRef}
        style={{ height }}
        className="w-full rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden bg-gray-100 dark:bg-[#12141a]"
        aria-label={t('listing.location')}
      />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        {!hasCoords && (
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5 max-w-[70%]">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--accent)]" />
            {placeable ? t('listing.locationApprox') : t('listing.locationUnknown')}
          </p>
        )}
        <a
          href={osmHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline ml-auto"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {t('listing.openMap')}
        </a>
      </div>
    </div>
  );
}
