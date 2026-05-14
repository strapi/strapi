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
    beforeEach(() => {
      // Reset global.strapi before each test to avoid state pollution
      global.strapi = {
        config: {
          get: jest.fn(() => ({})),
        },
        log: {
          warn: jest.fn(),
        },
        plugins: {},
        apis: {},
        admin: {
          services: {},
        },
      } as any;

      // Clear all mocks
      jest.clearAllMocks();
    });

    afterEach(() => {
      // Reset global.strapi after each test to ensure complete isolation
      global.strapi = {
        config: {
          get: jest.fn(() => ({})),
        },
        log: {
          warn: jest.fn(),
        },
        plugins: {},
        apis: {},
        admin: {
          services: {},
        },
      } as any;
    });

    test('Has defaults when no configuration is provided', () => {
      const getFn = jest.fn(() => ({})) as any;
      global.strapi.config.get = getFn;

      const res = getTokenOptions();

      expect(getFn).toHaveBeenCalledWith('admin.auth', {});
      expect(getFn).toHaveBeenCalledWith('admin.auth.sessions.options', {});
      expect(res).toEqual({
        secret: undefined,
        options: { expiresIn: '30d' },
      });
    });

    test('Merges defaults with legacy admin.auth.options configuration', () => {
      const config = {
        options: {
          algorithm: 'HS256',
          expiresIn: '1d',
        },
        secret: '123',
      };

      const getFn = jest.fn((key) => {
        if (key === 'admin.auth') return config;
        if (key === 'admin.auth.sessions.options') return {};
        return {};
      });

      // @ts-expect-error mock
      global.strapi.config.get = getFn;

      const res = getTokenOptions();

      expect(getFn).toHaveBeenCalledWith('admin.auth', {});
      expect(getFn).toHaveBeenCalledWith('admin.auth.sessions.options', {});
      expect(res).toEqual({
        secret: config.secret,
        options: {
          algorithm: 'HS256',
          expiresIn: '1d',
        },
      });
    });

    test('Uses new admin.auth.sessions.options configuration', () => {
      const config = {
        options: {},
        secret: '123',
      };

      const sessionsOptions = {
        algorithm: 'HS256',
        expiresIn: '2d',
        issuer: 'test-issuer',
      };

      const getFn = jest.fn((key) => {
        if (key === 'admin.auth') return config;
        if (key === 'admin.auth.sessions.options') return sessionsOptions;
        return {};
      });

      // @ts-expect-error mock
      global.strapi.config.get = getFn;

      const res = getTokenOptions();

      expect(getFn).toHaveBeenCalledWith('admin.auth', {});
      expect(getFn).toHaveBeenCalledWith('admin.auth.sessions.options', {});
      expect(res).toEqual({
        options: {
          algorithm: 'HS256',
          expiresIn: '2d',
          issuer: 'test-issuer',
        },
        secret: config.secret,
      });
      expect(global.strapi.log.warn).not.toHaveBeenCalled();
    });

    test('sessions.options takes priority over legacy auth.options', () => {
      const config = {
        options: {
          algorithm: 'HS256',
          expiresIn: '1d',
          issuer: 'legacy-issuer',
        },
        secret: '123',
      };

      const sessionsOptions = {
        algorithm: 'RS256',
        expiresIn: '2d',
        issuer: 'new-issuer',
        audience: 'test-audience',
      };

      const getFn = jest.fn((key) => {
        if (key === 'admin.auth') return config;
        if (key === 'admin.auth.sessions.options') return sessionsOptions;
        return {};
      });

      // @ts-expect-error mock
      global.strapi.config.get = getFn;

      const res = getTokenOptions();

      expect(res).toEqual({
        options: {
          algorithm: 'RS256', // sessions.options takes priority
          expiresIn: '2d', // sessions.options takes priority
          issuer: 'new-issuer', // sessions.options takes priority
          audience: 'test-audience', // from sessions.options
        },
        secret: config.secret,
      });
    });

    test('Supports asymmetric algorithm configuration', () => {
      const config = {
        options: {},
        secret: '123',
      };

      const sessionsOptions = {
        algorithm: 'RS256',
        privateKey: '-----BEGIN PRIVATE KEY-----\ntest-private-key\n-----END PRIVATE KEY-----',
        publicKey: '-----BEGIN PUBLIC KEY-----\ntest-public-key\n-----END PUBLIC KEY-----',
        issuer: 'test-issuer',
        audience: 'test-audience',
      };

      const getFn = jest.fn((key) => {
        if (key === 'admin.auth') return config;
        if (key === 'admin.auth.sessions.options') return sessionsOptions;
        return {};
      });

      // @ts-expect-error mock
      global.strapi.config.get = getFn;

      const res = getTokenOptions();

      expect(res).toEqual({
        secret: config.secret,
        options: {
          algorithm: 'RS256',
          expiresIn: '30d', // From defaultJwtOptions
          privateKey: '-----BEGIN PRIVATE KEY-----\ntest-private-key\n-----END PRIVATE KEY-----',
          publicKey: '-----BEGIN PUBLIC KEY-----\ntest-public-key\n-----END PUBLIC KEY-----',
          issuer: 'test-issuer',
          audience: 'test-audience',
        },
      });
    });

    test('Supports symmetric algorithm configuration', () => {
      const config = {
        options: {},
        secret: 'symmetric-secret-key',
      };

      const sessionsOptions = {
        algorithm: 'HS512',
        issuer: 'test-issuer',
        audience: 'test-audience',
        privateKey: '-----BEGIN PRIVATE KEY-----\ntest-private-key\n-----END PRIVATE KEY-----',
        publicKey: '-----BEGIN PUBLIC KEY-----\ntest-public-key\n-----END PUBLIC KEY-----',
      };

      const getFn = jest.fn((key) => {
        if (key === 'admin.auth') return config;
        if (key === 'admin.auth.sessions.options') return sessionsOptions;
        return {};
      });

      // @ts-expect-error mock
      global.strapi.config.get = getFn;

      const res = getTokenOptions();

      expect(res).toEqual({
        secret: config.secret,
        options: {
          algorithm: 'HS512',
          expiresIn: '30d', // From defaultJwtOptions
          issuer: 'test-issuer',
          audience: 'test-audience',
          privateKey: '-----BEGIN PRIVATE KEY-----\ntest-private-key\n-----END PRIVATE KEY-----',
          publicKey: '-----BEGIN PUBLIC KEY-----\ntest-public-key\n-----END PUBLIC KEY-----',
        },
      });
    });
  });

  describe('createToken', () => {
    test('Create a random token of length 40', () => {
      const token = createToken();

      expect(token).toBeDefined();
      expect(typeof token === 'string').toBe(true);
      expect(token.length).toBe(40);
    });
  });
});
