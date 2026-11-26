import { describe, test, expect } from 'vitest';

import { parseRouteId } from '../route-id';

describe('parseRouteId', () => {
  test('reads plain decimal digits as a number', () => {
    expect(parseRouteId('7')).toBe(7);
    expect(parseRouteId('07')).toBe(7);
    expect(parseRouteId(7)).toBe(7);
  });

  test('refuses every other id, which some databases would still match', () => {
    for (const id of ['7e0', '0x0A', ' 7', '+7', '7.0', '7abc', '-7', '', '9007199254740993']) {
      expect(parseRouteId(id)).toBeNull();
    }

    expect(parseRouteId(undefined)).toBeNull();
    expect(parseRouteId(-7)).toBeNull();
  });
});
