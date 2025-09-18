import { getTokenOptions, createToken, expiresInToSeconds } from '../token';

describe('expiresInToSeconds', () => {
  test('returns undefined for null/undefined', () => {
    expect(expiresInToSeconds(undefined as any)).toBeUndefined();
    expect(expiresInToSeconds(null as any)).toBeUndefined();
  });

  test('accepts numeric seconds', () => {
    expect(expiresInToSeconds(3600)).toBe(3600);
  });

  test('accepts numeric string seconds', () => {
    expect(expiresInToSeconds('180')).toBe(180);
  });

  test("parses '30d' correctly (approx in seconds)", () => {
    const seconds = expiresInToSeconds('30d');
    expect(typeof seconds).toBe('number');
    expect(seconds).toBe(30 * 24 * 60 * 60);
  });

  test("parses shorthand like '12h', '15m', '45s'", () => {
    expect(expiresInToSeconds('12h')).toBe(12 * 60 * 60);
    expect(expiresInToSeconds('15m')).toBe(15 * 60);
    expect(expiresInToSeconds('45s')).toBe(45);
  });

  test("parses '1w' as 7 days", () => {
    expect(expiresInToSeconds('1w')).toBe(7 * 24 * 60 * 60);
  });

  test('returns undefined for invalid strings', () => {
    expect(expiresInToSeconds('bad')).toBeUndefined();
    expect(expiresInToSeconds({} as any)).toBeUndefined();
  });
});

describe('Token', () => {
  describe('token options', () => {
    test('Has defaults', () => {
      const getFn = jest.fn(() => ({}));
      global.strapi = {
        config: {
          get: getFn,
        },
      } as any;

      const res = getTokenOptions();

      expect(getFn).toHaveBeenCalledWith('admin.auth', {});
      expect(res).toEqual({ options: { expiresIn: '30d' } });
    });

    test('Merges defaults with configuration', () => {
      const config = {
        options: {},
        secret: '123',
      };

      const getFn = jest.fn(() => config);
      global.strapi = {
        config: {
          get: getFn,
        },
      } as any;

      const res = getTokenOptions();

      expect(getFn).toHaveBeenCalledWith('admin.auth', {});
      expect(res).toEqual({
        options: {
          expiresIn: '30d',
        },
        secret: config.secret,
      });
    });

    test('Overwrite defaults with configuration options', () => {
      const config = {
        options: {
          expiresIn: '1d',
        },
        secret: '123',
      };

      const getFn = jest.fn(() => config);
      global.strapi = {
        config: {
          get: getFn,
        },
      } as any;

      const res = getTokenOptions();

      expect(getFn).toHaveBeenCalledWith('admin.auth', {});
      expect(res).toEqual({
        options: {
          expiresIn: '1d',
        },
        secret: config.secret,
      });
    });
  });

  describe('createToken', () => {
    test('Create a random token of length 128', () => {
      const token = createToken();

      expect(token).toBeDefined();
      expect(typeof token === 'string').toBe(true);
      expect(token.length).toBe(40);
    });
  });
});
