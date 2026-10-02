import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin, ArrowRight } from 'lucide-react';
import { cities, listings, type City } from '../../api/index';
import Section from './Section';

/** Cities with a live listing count, ranked by how much is on offer. */
export default function PopularLocations({ limit = 8 }: { limit?: number }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const { data: cityList = [], isLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: () => cities.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: counts = {} } = useQuery({
    queryKey: ['cityCounts', cityList.length],
    queryFn: async () => {
      const entries = await Promise.all(
        cityList.map(async (city: City) => {
          try {
            const res = await listings.search({ city_id: city.id, page: 1, page_size: 1 });
            return [city.id, res.total] as const;
          } catch {
            return [city.id, 0] as const;
          }
        }),
      );
      return Object.fromEntries(entries) as Record<number, number>;
    },
    enabled: cityList.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const ranked = useMemo(
    () =>
      [...cityList]
        .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
        .slice(0, limit),
    [cityList, counts, limit],
  );

  if (isLoading || ranked.length === 0) return null;

  return (
    <Section
      title={t('home.popularLocations')}
      hint={t('home.popularLocationsHint')}
      actionLabel={t('common.viewAll')}
      onAction={() => navigate('/search')}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {ranked.map((city) => {
          const count = counts[city.id] ?? 0;
          const label = i18n.language === 'tj' && city.name_tj ? city.name_tj : city.name;
          return (
            <button
              key={city.id}
              onClick={() => navigate(`/search?city_id=${city.id}`)}
              className="group bg-white dark:bg-[#12141a] rounded-xl border border-gray-200 dark:border-white/10 p-4 text-left hover:border-[rgb(var(--accent-rgb)/0.4)] hover:shadow-[0_10px_30px_-18px_rgba(255,107,53,0.4)] transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-[rgb(var(--accent-rgb)/0.1)] flex items-center justify-center group-hover:bg-[var(--accent)] transition">
                  <MapPin className="w-4 h-4 text-[var(--accent)] group-hover:text-white transition" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-sm text-[#1A1A2E] dark:text-white group-hover:text-[var(--accent)] transition-colors truncate">
                    {label}
                  </span>
                  <span className="block text-xs text-gray-400 dark:text-gray-500">
                    {t('home.results', { count })}
                  </span>
                </span>
                <ArrowRight className="w-4 h-4 shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-[var(--accent)] transition" />
              </div>
            </button>
          );
        })}
      </div>
    </Section>
  );
}
