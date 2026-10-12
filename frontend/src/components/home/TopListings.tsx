import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listings } from '../../api/index';
import ListingCarousel from '../listings/ListingCarousel';
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
      {/* The same shelf the showcase below uses — cut card at the right
          edge, arrows left and right — only narrower cards, so four paid
          windows stay in view instead of three. */}
      <ListingCarousel
        listings={items}
        loading={isLoading}
        cardClass="w-[270px] sm:w-[300px]"
      />
    </Section>
  );
}
