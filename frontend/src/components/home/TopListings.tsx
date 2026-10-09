import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listings } from '../../api/index';
import ListingCard from '../listings/ListingCard';
import Section from './Section';

/**
 * Paid TOP placements on the homepage.
 *
 * The list comes from `GET /listings/top`, which only ever returns windows
 * that are live *right now* (`expires_at > now` is part of the query), so the
 * browser never decides who is promoted. When nobody holds a window the
 * endpoint answers with an empty list and this section renders nothing at
 * all - an empty "TOP" block would only advertise that nobody bought one.
 */
export default function TopListings() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['topListings'],
    queryFn: () => listings.top(12),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const items = data ?? [];
  if (!isLoading && items.length === 0) return null;

  return (
    <Section
      title={t('top.sectionTitle')}
      hint={t('top.sectionHint')}
      actionLabel={t('common.viewAll')}
      onAction={() => navigate('/search')}
    >
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        {isLoading
          ? [0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="shrink-0 w-[270px] sm:w-[300px] h-[320px] rounded-2xl bg-gray-100 dark:bg-slate-800/60 animate-pulse"
                aria-hidden="true"
              />
            ))
          : items.map((item) => (
              <div key={item.id} className="shrink-0 w-[270px] sm:w-[300px]">
                <ListingCard listing={item} />
              </div>
            ))}
      </div>
    </Section>
  );
}
