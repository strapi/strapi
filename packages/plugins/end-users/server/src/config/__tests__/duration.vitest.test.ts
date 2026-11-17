import { describe, expect, it } from 'vitest';

import { parseDuration } from '../duration';

describe('parseDuration', () => {
  it('reads a number and a unit as seconds', () => {
    expect(parseDuration('30s')).toBe(30);
    expect(parseDuration('5m')).toBe(300);
    expect(parseDuration('12h')).toBe(12 * 3600);
    expect(parseDuration('7d')).toBe(7 * 86400);
    expect(parseDuration('2w')).toBe(14 * 86400);
  });

  it('takes a whole number of seconds as it is', () => {
    expect(parseDuration(3600)).toBe(3600);
    expect(parseDuration(1)).toBe(1);
  });

  it('ignores white space around the value', () => {
    expect(parseDuration(' 1d ')).toBe(86400);
  });

  it('gives nothing for what it cannot read', () => {
    for (const value of [
      '',
      'd',
      '1',
      '1 d',
      '1.5d',
      '-1d',
      '0d',
      '1y',
      '1D',
      0,
      -1,
      1.5,
      NaN,
      Infinity,
      null,
      undefined,
      true,
      {},
      [],
    ]) {
      expect(parseDuration(value), JSON.stringify(value)).toBeUndefined();
    }
  });
});
