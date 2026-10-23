import passwordPolicyService, {
  DEFAULT_PASSWORD_POLICY,
  PASSWORD_MIN_LENGTH_CEILING,
  PASSWORD_MIN_LENGTH_FLOOR,
} from '../password-policy';

const { getPolicy, updatePolicy, getViolations, isCompliant } = passwordPolicyService;

const storeGet = jest.fn();
const storeSet = jest.fn();

const rulesOf = (password: string, policy = DEFAULT_PASSWORD_POLICY) =>
  getViolations(password, policy).map((violation) => violation.rule);

describe('Password policy service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.strapi = {
      store: () => ({ get: storeGet, set: storeSet }),
    } as any;
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
  });

  describe('getViolations', () => {
    test('accepts a password satisfying the default policy', () => {
      expect(getViolations('Testing1234')).toEqual([]);
      expect(isCompliant('Testing1234')).toBe(true);
    });

    test('reports every broken rule, in display order', () => {
      expect(getViolations('123')).toEqual([
        { rule: 'minLength', message: 'must be at least 8 characters' },
        { rule: 'lowercase', message: 'must contain at least one lowercase character' },
        { rule: 'uppercase', message: 'must contain at least one uppercase character' },
      ]);
      expect(isCompliant('123')).toBe(false);
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
    });

    test('recognises letters and digits beyond ASCII', () => {
      expect(rulesOf('ÉCOLE-été-2024')).toEqual([]);
      expect(rulesOf('ÀÇÈ-ÉÊË-٢٠٢٤')).toEqual(['lowercase']);
    });
  });
});
