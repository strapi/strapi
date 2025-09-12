import {
  createJwtToken,
  getTokenOptions,
  decodeJwtToken,
  createToken,
  expiresInToSeconds,
} from '../token';

const delay = (time: any) =>
  new Promise((resolve) => {
    setTimeout(resolve, time);
  });

describe('expiresInToSeconds', () => {
  const secret = 'test-123';

  test('returns undefined for null/undefined', () => {
    expect(expiresInToSeconds(undefined as any, secret)).toBeUndefined();
    expect(expiresInToSeconds(null as any, secret)).toBeUndefined();
  });

  test('accepts numeric seconds', () => {
    expect(expiresInToSeconds(3600, secret)).toBe(3600);
  });

  test('accepts numeric string seconds', () => {
    expect(expiresInToSeconds('180', secret)).toBe(180);
  });

  test("parses '30d' correctly (approx in seconds)", () => {
    const seconds = expiresInToSeconds('30d', secret);
    expect(typeof seconds).toBe('number');
    expect(seconds).toBe(30 * 24 * 60 * 60);
  });

  test("parses shorthand like '12h', '15m', '45s'", () => {
    expect(expiresInToSeconds('12h', secret)).toBe(12 * 60 * 60);
    expect(expiresInToSeconds('15m', secret)).toBe(15 * 60);
    expect(expiresInToSeconds('45s', secret)).toBe(45);
  });

  test("parses '1w' as 7 days", () => {
    expect(expiresInToSeconds('1w', secret)).toBe(7 * 24 * 60 * 60);
  });

  test('returns undefined for invalid strings', () => {
    expect(expiresInToSeconds('bad', secret)).toBeUndefined();
    expect(expiresInToSeconds({} as any, secret)).toBeUndefined();
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

  describe('createJwtToken', () => {
    test('Returns a jwt token', () => {
      global.strapi = {
        config: {
          get() {
            return {
              secret: 'test-123',
            };
          },
        },
      } as any;

      const token = createJwtToken({ id: 1 });

      expect(token).toBeDefined();
      expect(typeof token === 'string').toBe(true);
    });

    test('Token payload does not leak user infos', () => {
      global.strapi = {
        config: {
          get() {
            return {
              secret: 'test-123',
            };
          },
        },
      } as any;

      const token = createJwtToken({
        id: 1,
      });

      const { payload } = decodeJwtToken(token);

      expect(payload).toEqual({
        id: 1,
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
    });
  });

  describe('decodeJwtToken', () => {
    test('Fails if the token is invalid', () => {
      const { payload, isValid } = decodeJwtToken('invalid-token');
      expect(payload).toBe(null);
      expect(isValid).toBe(false);
    });

    test('Fails if the token was not generated with the same secret', () => {
      global.strapi = {
        config: {
          get() {
            return {
              secret: 'test-123',
            };
          },
        },
      } as any;

      const user = { id: 1 };
      const token = createJwtToken(user);

      global.strapi = {
        config: {
          get() {
            return {
              secret: 'not-the-same-secret',
            };
          },
        },
      } as any;

      const { payload, isValid } = decodeJwtToken(token);
      expect(payload).toBe(null);
      expect(isValid).toBe(false);
    });

    test('Fails if the token has expired', async () => {
      global.strapi = {
        config: {
          get() {
            return {
              options: {
                expiresIn: '1ms',
              },
              secret: 'test-123',
            };
          },
        },
      } as any;

      const user = { id: 1 };
      const token = createJwtToken(user);

      await delay(10);

      const { payload, isValid } = decodeJwtToken(token);
      expect(payload).toBe(null);
      expect(isValid).toBe(false);
    });

    test('Returns payload if token is valid', async () => {
      global.strapi = {
        config: {
          get() {
            return {
              options: { expiresIn: '30d' },
              secret: 'test-123',
            };
          },
        },
      } as any;

      const user = { id: 1 };
      const token = createJwtToken(user);

      const { payload, isValid } = decodeJwtToken(token);
      expect(payload).toEqual({
        id: 1,
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
      expect(isValid).toBe(true);
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
