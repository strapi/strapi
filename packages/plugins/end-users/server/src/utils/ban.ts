/**
 * Where a user stands with a ban, read from the user row (`banned`, `banExpires`).
 *
 * - `none`: not banned
 * - `active`: banned now
 * - `expired`: banned with an end date that has passed. Not a ban any more; signing in again clears
 *   the flags, a read leaves them as they are.
 *
 * An end date that cannot be read is no end date: the ban holds. Reading it as "ran out" would let
 * a banned user in because of a bad value.
 */
export type BanState = 'none' | 'active' | 'expired';

const toTime = (value: unknown) => {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value).getTime();
  }

  return Number.NaN;
};

export const banState = (
  user: { banned?: unknown; banExpires?: unknown },
  now: number = Date.now()
): BanState => {
  if (!user.banned) {
    return 'none';
  }

  const { banExpires } = user;

  if (banExpires === null || banExpires === undefined || banExpires === '') {
    return 'active';
  }

  const endsAt = toTime(banExpires);

  if (Number.isNaN(endsAt)) {
    return 'active';
  }

  return endsAt > now ? 'active' : 'expired';
};
