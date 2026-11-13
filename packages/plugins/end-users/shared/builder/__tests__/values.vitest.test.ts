import { describe, expect, it } from 'vitest';

import { valueProblem } from '../values';

describe('valueProblem', () => {
  it.each([
    ['date', '$eq', '2026-11-04'],
    ['date', '$eq', '2028-02-29'],
    ['datetime', '$gt', '2026-11-04T09:30:00Z'],
    ['datetime', '$gt', '2026-11-04T09:30:00.123+02:00'],
    ['time', '$eq', '09:30'],
    ['time', '$eq', '23:59:59.999'],
    ['enumeration', '$eq', 'silver'],
    ['integer', '$eq', 3],
    ['biginteger', '$eq', '12345678901234567890'],
    ['float', '$lt', 1.5],
    ['boolean', '$eq', true],
    ['string', '$contains', 'E2E'],
    ['integer', '$null', true],
  ] as const)('accepts %s %s %j', (type, operator, value) => {
    expect(valueProblem(type, operator, value, ['silver'])).toBeNull();
  });

  it.each([
    ['date', '$eq', '2026-13-01'],
    ['date', '$eq', '2026-02-30'],
    ['datetime', '$eq', 'next week'],
    ['datetime', '$eq', '2026-11-04T09:30:00'],
    ['time', '$eq', '25:00'],
    ['enumeration', '$eq', 'gold'],
    ['integer', '$eq', 1.5],
    ['biginteger', '$eq', '12.5'],
    ['integer', '$eq', '3'],
    ['boolean', '$eq', 'true'],
    ['string', '$contains', ''],
    ['integer', '$null', 'yes'],
  ] as const)('refuses %s %s %j', (type, operator, value) => {
    expect(valueProblem(type, operator, value, ['silver'])).toEqual(expect.any(String));
  });

  it('refuses a list that is empty, too long or has a bad item', () => {
    expect(valueProblem('string', '$in', [])).toEqual(expect.any(String));
    expect(valueProblem('string', '$in', Array(100).fill('a'))).toBeNull();
    expect(valueProblem('string', '$in', Array(101).fill('a'))).toEqual(expect.any(String));
    expect(valueProblem('integer', '$in', [1, 2.5])).toEqual(expect.any(String));
    expect(valueProblem('integer', '$in', 3)).toEqual(expect.any(String));
  });

  it('refuses a text over 1,000 characters', () => {
    expect(valueProblem('string', '$eq', 'a'.repeat(1_000))).toBeNull();
    expect(valueProblem('string', '$eq', 'a'.repeat(1_001))).toEqual(expect.any(String));
  });

  it('refuses a fixed text the engine would read as a placeholder', () => {
    expect(valueProblem('string', '$eq', '$user.email')).toEqual(expect.any(String));
    expect(valueProblem('string', '$contains', '$profile')).toEqual(expect.any(String));
    expect(valueProblem('string', '$in', ['a', '$params.x'])).toEqual(expect.any(String));
    expect(valueProblem('string', '$eq', '$now')).toEqual(expect.any(String));
    expect(valueProblem('string', '$eq', 'costs $5')).toBeNull();
  });

  it('takes a pattern as text whatever the field', () => {
    expect(valueProblem('integer', '$contains', '12')).toBeNull();
  });
});
