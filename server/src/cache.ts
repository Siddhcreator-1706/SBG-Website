import NodeCache from 'node-cache';

export const cache = new NodeCache({ stdTTL: 60 });

export const CACHE_KEYS = {
  venues: 'venues',
  clubs: 'clubs',
  publicBookings: 'public_bookings',
} as const;

export function invalidatePublicBookings() {
  cache.del(CACHE_KEYS.publicBookings);
}

export function invalidateClubs() {
  cache.del(CACHE_KEYS.clubs);
}

export function invalidateVenues() {
  cache.del(CACHE_KEYS.venues);
}

export function invalidatePublicData() {
  cache.del([CACHE_KEYS.venues, CACHE_KEYS.clubs, CACHE_KEYS.publicBookings]);
}
