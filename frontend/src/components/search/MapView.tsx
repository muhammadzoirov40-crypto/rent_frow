import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, ExternalLink } from 'lucide-react';
import type { ListingListItem } from '../../api/index';
import { formatPrice } from '../../utils/format';

// Leaflet's default marker images are resolved relative to the CSS, which Vite
// does not bundle — point them at the CDN copies shipped with the package.
const DEFAULT_ICON = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const DEFAULT_ICON_2X = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const DEFAULT_SHADOW = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconUrl: DEFAULT_ICON,
  iconRetinaUrl: DEFAULT_ICON_2X,
  shadowUrl: DEFAULT_SHADOW,
});

const TAJIKISTAN_CENTER: [number, number] = [38.86, 71.27];
const DEFAULT_ZOOM = 7;

export interface MapItem extends ListingListItem {
  latitude?: number | null;
  longitude?: number | null;
}

interface MapViewProps {
  items: MapItem[];
  /** Re-centres the map when this changes (e.g. a city filter). */
  focus?: { lat: number; lng: number } | null;
  className?: string;
  height?: string;
}

/** Interactive map of the current result set; listings without coordinates fall
 *  back to their city centroid, so every pin lands somewhere sensible. */
export default function MapView({ items, focus, className = '', height = '28rem' }: MapViewProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const popupRef = useRef<L.Popup | null>(null);

  // Create the map once and tear it down with the component.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: TAJIKISTAN_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: false,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    popupRef.current = L.popup();
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      popupRef.current = null;
    };
  }, []);

  // Recenter when the caller changes the focus (city filter, geolocation).
  useEffect(() => {
    if (!mapRef.current || !focus) return;
    mapRef.current.setView([focus.lat, focus.lng], 10);
  }, [focus]);

  // Redraw pins whenever the result set changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const placed: L.LatLngExpression[] = [];

    items.forEach((item) => {
      const lat = item.latitude ?? null;
      const lng = item.longitude ?? null;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      const price = formatPrice(item.price, t);
      const marker = L.marker([lat, lng]);

      marker.bindPopup(
        `<div style="min-width:180px;font-family:inherit">
           <div style="font-weight:700;font-size:14px;margin-bottom:4px">${
             item.title.length > 60 ? `${item.title.slice(0, 60)}…` : item.title
           }</div>
           <div style="font-size:13px;color:#ff6b35;font-weight:700">${price}</div>
           <div style="font-size:12px;color:#6b7280;margin-top:2px">${
             item.city_name || ''
           }</div>
           <a href="/listing/${item.id}" data-listing-id="${
             item.id
           }" style="display:inline-block;margin-top:8px;font-size:12px;font-weight:700;color:#ff6b35;text-decoration:none">${
             t('common.viewDetails')
           } →</a>
         </div>`,
      );

      layer.addLayer(marker);
      placed.push([lat, lng]);
    });

    // Popup links use a plain <a>, so route them through the SPA router.
    map.off('popupopen');
    map.on('popupopen', (e) => {
      const el = (e.popup as L.Popup).getElement()?.querySelector('a[data-listing-id]');
      if (!el) return;
      const handler = (ev: Event) => {
        ev.preventDefault();
        const id = el.getAttribute('data-listing-id');
        map.closePopup();
        navigate(`/listing/${id}`);
      };
      el.addEventListener('click', handler);
    });

    if (placed.length > 0 && !focus) {
      map.fitBounds(L.latLngBounds(placed).pad(0.2), { maxZoom: 12 });
    }
  }, [items, focus, navigate, t]);

  const hasPins = items.some(
    (i) => typeof i.latitude === 'number' && typeof i.longitude === 'number',
  );

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden bg-gray-100 dark:bg-[#12141a] z-0"
        aria-label={t('search.mapView')}
      />
      {!hasPins && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[500] flex justify-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-[#1A1A2E]/95 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-gray-300 shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
            {t('search.mapNoPins')}
          </span>
        </div>
      )}
      {hasPins && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[500] flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 dark:bg-[#1A1A2E]/95 border border-gray-200 dark:border-white/10 text-[11px] font-semibold text-gray-500 dark:text-gray-400 shadow-sm">
            <ExternalLink className="w-3 h-3" />
            {t('search.mapHint')}
          </span>
        </div>
      )}
    </div>
  );
}
