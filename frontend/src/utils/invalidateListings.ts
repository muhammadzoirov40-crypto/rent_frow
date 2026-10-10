import type { QueryClient } from '@tanstack/react-query';

/**
 * Every cache a listing can appear in, named in one place.
 *
 * There is no query called `listings`. The search page, the owner's own
 * dashboard, the home showcase, the "near you" block and the similar strip
 * each keep their own key with their own parameters — so invalidating a key
 * that matches none of them reports success and quietly leaves every page
 * showing what was there before. Owners saw exactly that: they posted, and
 * their listing was nowhere until they reloaded.
 *
 * The keys below are the read sites' own keys, so this list has to grow when
 * a new place starts showing listings.
 */
const LISTING_QUERY_KEYS = [
  'owner-listings', // profile + dashboard "my listings"
  'search', // search page, every parameter set
  'showcase', // home showcase tabs
  'nearby', // home "near you"
  'heroRealListings', // home hero
  'topListings', // the TOP strip
  'similarListings', // similar block on a listing page
  'listing', // every listing detail page, not only the one in hand
  'favorites',
  'categoryCounts', // a new listing moves the counts
  'cityCounts',
] as const;

/**
 * Invalidate all of them at once. Returns the combined promise so a caller
 * that wants to wait (a mutation's onSuccess returning a promise) can.
 */
export function invalidateListingQueries(queryClient: QueryClient) {
  return Promise.all(
    LISTING_QUERY_KEYS.map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
  );
}
