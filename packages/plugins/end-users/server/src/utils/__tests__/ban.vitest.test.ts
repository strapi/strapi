import { describe, expect, it } from 'vitest';

import { banState } from '../ban';

const NOW = Date.parse('2026-10-28T12:00:00.000Z');
const LATER = new Date(NOW + 60_000);
const EARLIER = new Date(NOW - 60_000);

describe('banState', () => {
  it('is none when the flag is off, whatever the end date says', () => {
    for (const banned of [false, null, undefined, 0]) {
      expect(banState({ banned, banExpires: LATER }, NOW), String(banned)).toBe('none');
    }
  });

  it('is active for a ban with no end', () => {
    for (const banExpires of [null, undefined, '']) {
      expect(banState({ banned: true, banExpires }, NOW), String(banExpires)).toBe('active');
    }
  });

  it('is active until the end, read from a date, an ISO string or a timestamp', () => {
    for (const banExpires of [LATER, LATER.toISOString(), LATER.getTime()]) {
      expect(banState({ banned: true, banExpires }, NOW), String(banExpires)).toBe('active');
    }
  });

  it('is expired once the end has passed, and at the very moment it is reached', () => {
    for (const banExpires of [EARLIER, EARLIER.toISOString(), EARLIER.getTime(), new Date(NOW)]) {
      expect(banState({ banned: true, banExpires }, NOW), String(banExpires)).toBe('expired');
    }
  });

  it('is active when the end cannot be read: a bad value never lets a banned user in', () => {
    for (const banExpires of ['not a date', 'Invalid Date', Number.NaN, {}, [], true]) {
      expect(banState({ banned: true, banExpires }, NOW), JSON.stringify(banExpires)).toBe(
        'active'
      );
    }
  });

  it('reads the clock when no time is given', () => {
    expect(banState({ banned: true, banExpires: new Date(Date.now() + 60_000) })).toBe('active');
    expect(banState({ banned: true, banExpires: new Date(Date.now() - 60_000) })).toBe('expired');
  });
});
