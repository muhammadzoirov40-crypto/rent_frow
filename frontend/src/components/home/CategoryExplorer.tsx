import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { categories, listings, type Category } from '../../api/index';
import { localizeCategoryName } from '../../utils/categoryName';
import { iconFor } from '../../utils/categoryIcons';
import Section from './Section';

const GROUP_META: { key: string; labelKey: string; hintKey: string }[] = [
  { key: 'property', labelKey: 'home.groupProperty', hintKey: 'home.groupPropertyHint' },
  { key: 'transport', labelKey: 'home.groupTransport', hintKey: 'home.groupTransportHint' },
  { key: 'equipment', labelKey: 'home.groupEquipment', hintKey: 'home.groupEquipmentHint' },
  { key: 'events', labelKey: 'home.groupEvents', hintKey: 'home.groupEventsHint' },
  { key: 'other', labelKey: 'home.groupOther', hintKey: 'home.groupOtherHint' },
];

export default function CategoryExplorer() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [activeGroup, setActiveGroup] = useState<string>('');

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: categoryCounts = {} } = useQuery({
    queryKey: ['categoryCounts'],
    queryFn: async () => {
      const all = await categories.getAll();
      const entries = await Promise.all(
        all.items.map(async (cat) => {
          try {
            const res = await listings.search({ category_id: cat.id, page: 1, page_size: 1 });
            return [cat.id, res.total] as const;
          } catch {
            return [cat.id, 0] as const;
          }
        }),
      );
      return Object.fromEntries(entries) as Record<number, number>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const all: Category[] = categoriesData?.items || [];

  const groups = useMemo(() => {
    const map = new Map<string, Category[]>();
    all.forEach((cat) => {
      const g = cat.category_group || 'other';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(cat);
    });
    return map;
  }, [all]);

  // Hide the group tabs when the database has not been grouped yet.
  const hasGroups = Array.from(groups.keys()).some((g) => g !== 'other');
  const visibleGroups = GROUP_META.filter((g) => groups.has(g.key) && groups.get(g.key)!.length > 0);
  const shown = activeGroup && groups.has(activeGroup) ? groups.get(activeGroup)! : all;

  if (isLoading) {
    return (
      <Section id="categories" title={t('home.popularCategories')} hint={t('home.categoriesHint')}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-white/5 animate-skeleton" />
          ))}
        </div>
      </Section>
    );
  }

  if (all.length === 0) return null;

  const currentHint = activeGroup
    ? GROUP_META.find((g) => g.key === activeGroup)?.hintKey
    : undefined;

  return (
    <Section
      id="categories"
      title={t('home.popularCategories')}
      hint={currentHint ? t(currentHint) : t('home.categoriesHint')}
      actionLabel={t('common.viewAll')}
      onAction={() => navigate('/search')}
    >
      {hasGroups && (
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          <button
            onClick={() => setActiveGroup('')}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition ${
              !activeGroup
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-md shadow-[rgb(var(--accent-rgb)/0.3)]'
                : 'bg-white dark:bg-[#12141a] border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-[rgb(var(--accent-rgb)/0.5)]'
            }`}
          >
            {t('common.all')}
          </button>
          {visibleGroups.map((g) => (
            <button
              key={g.key}
              onClick={() => setActiveGroup(g.key)}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition ${
                activeGroup === g.key
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-md shadow-[rgb(var(--accent-rgb)/0.3)]'
                  : 'bg-white dark:bg-[#12141a] border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-[rgb(var(--accent-rgb)/0.5)]'
              }`}
            >
              {t(g.labelKey)}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {shown.map((cat) => {
          const Icon = iconFor(cat, i18n.language);
          const count = categoryCounts[cat.id];
          return (
            <button
              key={cat.id}
              onClick={() => navigate(`/search?category_id=${cat.id}`)}
              className="group h-full flex flex-col items-center justify-center text-center bg-white dark:bg-[#111827] border border-gray-200/80 dark:border-white/10 rounded-2xl p-5 hover:border-[rgb(var(--accent-rgb)/0.5)] hover:shadow-[0_14px_30px_-10px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_14px_30px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 shrink-0 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center mb-3 group-hover:bg-[var(--accent)] group-hover:border-[var(--accent)] group-hover:shadow-md group-hover:shadow-[rgb(var(--accent-rgb)/0.3)] transition-all duration-300">
                {cat.image_url ? (
                  <img src={cat.image_url} alt="" className="w-6 h-6 object-contain" loading="lazy" />
                ) : (
                  <Icon className="w-5 h-5 text-[var(--accent)] group-hover:text-white transition" />
                )}
              </div>
              <h3 className="font-semibold text-sm text-[#1A1A2E] dark:text-white group-hover:text-[var(--accent)] transition-colors leading-snug">
                {localizeCategoryName(cat, i18n.language)}
              </h3>
              <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('home.listingsCount', { count: count ?? 0 })}
              </p>
            </button>
          );
        })}
      </div>
    </Section>
  );
}
