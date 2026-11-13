/**
 * Durations in the plugin configuration (`session.expiresIn`, `session.updateAge`,
 * `session.cookieCache`): a whole number of seconds, or a whole number and a unit (`'7d'`, `'12h'`,
 * `'5m'`, `'30s'`, `'2w'`). Better Auth wants seconds.
 */
const UNIT_SECONDS: Readonly<Record<string, number>> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
  w: 7 * 24 * 60 * 60,
};

const DURATION = /^(\d+)([smhdw])$/;

/** The duration in seconds, or `undefined` when it is not a positive duration the plugin reads. */
export const parseDuration = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const match = DURATION.exec(value.trim());

  if (!match) {
    return undefined;
  }

  const seconds = Number(match[1]) * UNIT_SECONDS[match[2]];

  return seconds > 0 ? seconds : undefined;
};
