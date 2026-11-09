import { describe, test, expect, beforeEach, vi } from 'vitest';

import passwordPolicyService, {
  DEFAULT_PASSWORD_POLICY,
  PASSWORD_MIN_LENGTH_CEILING,
  PASSWORD_MIN_LENGTH_FLOOR,
} from '../password-policy';

const storeGet = vi.fn();
const storeSet = vi.fn();

const { getPolicy, updatePolicy, getViolations, isCompliant } = passwordPolicyService({
  strapi: { store: () => ({ get: storeGet, set: storeSet }) } as any,
});

const rulesOf = (password: string, policy = DEFAULT_PASSWORD_POLICY) =>
  getViolations(password, policy).map((violation) => violation.rule);

describe('Password policy service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('reads the policy of the instance it belongs to, not the global one', async () => {
    const storeOf = (minLength: number) => () => ({
      get: vi.fn(async () => ({ minLength })),
      set: vi.fn(),
    });
    // Another instance is the global one
    global.strapi = { store: storeOf(8) } as any;

    const service = passwordPolicyService({ strapi: { store: storeOf(20) } as any });

    expect((await service.getPolicy()).minLength).toBe(20);
  });

  describe('constants', () => {
    test('the default policy matches the rules Strapi always enforced', () => {
      expect(DEFAULT_PASSWORD_POLICY).toEqual({
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumber: true,
        requireSpecialCharacter: false,
      });
    });

    test('the configurable minimum length stays within sensible bounds', () => {
      expect(PASSWORD_MIN_LENGTH_FLOOR).toBe(8);
      expect(PASSWORD_MIN_LENGTH_CEILING).toBeGreaterThan(PASSWORD_MIN_LENGTH_FLOOR);
      expect(DEFAULT_PASSWORD_POLICY.minLength).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH_FLOOR);
    });
  });

  describe('getPolicy', () => {
    test('returns the defaults when nothing is stored', async () => {
      storeGet.mockResolvedValue(null);

      await expect(getPolicy()).resolves.toEqual(DEFAULT_PASSWORD_POLICY);
      expect(storeGet).toHaveBeenCalledWith({ key: 'password-policy' });
    });

    test('merges the stored policy on top of the defaults', async () => {
      storeGet.mockResolvedValue({ minLength: 12, requireSpecialCharacter: true });

      await expect(getPolicy()).resolves.toEqual({
        ...DEFAULT_PASSWORD_POLICY,
        minLength: 12,
        requireSpecialCharacter: true,
      });
    });

    test('ignores unknown keys and values of the wrong type', async () => {
      storeGet.mockResolvedValue({
        minLength: '12',
        requireNumber: 'nope',
        requireUppercase: false,
        somethingElse: true,
      });

      await expect(getPolicy()).resolves.toEqual({
        ...DEFAULT_PASSWORD_POLICY,
        requireUppercase: false,
      });
    });

    test.each([
      [1, PASSWORD_MIN_LENGTH_FLOOR],
      [100, PASSWORD_MIN_LENGTH_CEILING],
      [11.5, 12],
    ])('clamps a stored minLength of %s to %s', async (stored, expected) => {
      storeGet.mockResolvedValue({ minLength: stored });

      await expect(getPolicy()).resolves.toEqual({
        ...DEFAULT_PASSWORD_POLICY,
        minLength: expected,
      });
    });

    test('ignores a stored minLength that is not a finite number', async () => {
      storeGet.mockResolvedValue({ minLength: Number.NaN });

      await expect(getPolicy()).resolves.toEqual(DEFAULT_PASSWORD_POLICY);
    });
  });

  describe('updatePolicy', () => {
    test('stores the full policy and returns it', async () => {
      storeGet.mockResolvedValue({ requireUppercase: false });

      const result = await updatePolicy({ minLength: 16, requireSpecialCharacter: true });

      const expected = {
        ...DEFAULT_PASSWORD_POLICY,
        requireUppercase: false,
        minLength: 16,
        requireSpecialCharacter: true,
      };

      expect(storeSet).toHaveBeenCalledWith({ key: 'password-policy', value: expected });
      expect(result).toEqual(expected);
    });

    test('drops unknown keys before storing', async () => {
      storeGet.mockResolvedValue(null);

      await updatePolicy({ minLength: 10, unknown: true } as any);

      expect(storeSet).toHaveBeenCalledWith({
        key: 'password-policy',
        value: { ...DEFAULT_PASSWORD_POLICY, minLength: 10 },
      });
    });

    test.each([
      2,
      PASSWORD_MIN_LENGTH_FLOOR - 1,
      PASSWORD_MIN_LENGTH_CEILING + 1,
      10.5,
      Number.NaN,
    ])('rejects a minLength of %s without storing anything', async (minLength) => {
      storeGet.mockResolvedValue(null);

      await expect(updatePolicy({ minLength })).rejects.toThrow(
        `minLength must be an integer between ${PASSWORD_MIN_LENGTH_FLOOR} and ${PASSWORD_MIN_LENGTH_CEILING}`
      );
      expect(storeSet).not.toHaveBeenCalled();
    });
  });

  describe('getViolations', () => {
    test('accepts a password satisfying the default policy', () => {
      expect(getViolations('Testing1234', DEFAULT_PASSWORD_POLICY)).toEqual([]);
      expect(isCompliant('Testing1234', DEFAULT_PASSWORD_POLICY)).toBe(true);
    });

    test('reports every broken rule, in display order', () => {
      expect(getViolations('123', DEFAULT_PASSWORD_POLICY)).toEqual([
        { rule: 'minLength', message: 'must be at least 8 characters' },
        { rule: 'lowercase', message: 'must contain at least one lowercase character' },
        { rule: 'uppercase', message: 'must contain at least one uppercase character' },
      ]);
      expect(isCompliant('123', DEFAULT_PASSWORD_POLICY)).toBe(false);
    });

    test('uses the configured minimum length in the message', () => {
      const policy = { ...DEFAULT_PASSWORD_POLICY, minLength: 12 };

      expect(getViolations('Testing1234', policy)).toEqual([
        { rule: 'minLength', message: 'must be at least 12 characters' },
      ]);
      expect(rulesOf('Testing12345', policy)).toEqual([]);
    });

    test('only checks the rules the policy enables', () => {
      const relaxed = {
        minLength: 8,
        requireLowercase: false,
        requireUppercase: false,
        requireNumber: false,
        requireSpecialCharacter: false,
      };

      expect(rulesOf('lowercaseonly', relaxed)).toEqual([]);
      expect(rulesOf('short', relaxed)).toEqual(['minLength']);
    });

    test('can require a special character', () => {
      const policy = { ...DEFAULT_PASSWORD_POLICY, requireSpecialCharacter: true };

      expect(rulesOf('Testing1234', policy)).toEqual(['specialCharacter']);
      expect(rulesOf('Testing1234!', policy)).toEqual([]);
      expect(rulesOf('Testing 1234', policy)).toEqual([]);
      // Letters and digits from any script are not special characters
      expect(rulesOf('Testingé1234', policy)).toEqual(['specialCharacter']);
      // Numbers that are not decimal digits are neither digits nor letters, so they count
      expect(rulesOf('Abcdefgh²1', policy)).toEqual([]);
      expect(rulesOf('Abcdefgh½1', policy)).toEqual([]);
      expect(rulesOf('AbcdefghⅫ1', policy)).toEqual([]);
    });

    test('rejects passwords over 72 bytes whatever the policy says', () => {
      const password = `Aa1${'x'.repeat(80)}`;

      expect(getViolations(password, DEFAULT_PASSWORD_POLICY)).toEqual([
        { rule: 'maxBytes', message: 'must be less than 73 bytes' },
      ]);
      expect(isCompliant(password, DEFAULT_PASSWORD_POLICY)).toBe(false);
      // Multi-byte characters count by their UTF-8 size, not their length
      expect(rulesOf(`Aa1${'é'.repeat(35)}`)).toEqual(['maxBytes']);
    });

    test('recognises letters and digits beyond ASCII', () => {
      expect(rulesOf('ÉCOLE-été-2024')).toEqual([]);
      expect(rulesOf('ÀÇÈ-ÉÊË-٢٠٢٤')).toEqual(['lowercase']);
    });
  });
});
