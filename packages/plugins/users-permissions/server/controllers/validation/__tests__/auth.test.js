'use strict';

const errors = require('@strapi/utils');
const auth = require('../../auth');

const mockStrapi = {
  contentAPI: {
    sanitize: {
      output: jest.fn((input) => input),
    },
  },
  store: jest.fn(() => {
    return {
      get: jest.fn(() => {
        return { allow_register: true };
      }),
    };
  }),
  config: {
    get: jest.fn(() => {
      return {
        register: {
          // only set allowedFields on a per-test basis
        },
      };
    }),
  },
  db: {
    query: jest.fn(() => {
      return {
        findOne: jest.fn(() => {
          return {
            role: 1,
          };
        }),
        count: jest.fn(() => {
          return 0;
        }),
      };
    }),
  },
  plugins: {
    'users-permissions': {
      controllers: {},
      contentTypes: {},
      policies: {},
      services: {},
    },
  },
  getModel: jest.fn(),
};

jest.mock('@strapi/utils', () => {
  return {
    ...jest.requireActual('@strapi/utils'),
    sanitizeUser: jest.fn((input) => input),
    sanitize: {
      contentAPI: {
        output: jest.fn((input) => input),
      },
    },
  };
});

jest.mock('../../../utils', () => {
  return {
    getService: jest.fn(() => {
      return {
        add: jest.fn((user) => {
          return user;
        }),
        issue: jest.fn(),
      };
    }),
  };
});

describe('user-permissions auth', () => {
  beforeAll(() => {
    global.strapi = mockStrapi;
  });

  describe('register', () => {
    test('accepts valid registration', async () => {
      const ctx = {
        state: {
          auth: {},
        },
        request: {
          body: { username: 'testuser', email: 'test@example.com', password: 'Testpassword1!' },
        },
        send: jest.fn(),
      };

      await auth.register(ctx);
      expect(ctx.send).toHaveBeenCalledTimes(1);
    });

    test('throws ValidationError when passed extra fields when allowedField is undefined', async () => {
      global.strapi = {
        ...mockStrapi,
        config: {
          get: jest.fn(() => {
            return {
              register: {
                // empty
              },
            };
          }),
        },
      };

      const ctx = {
        state: {
          auth: {},
        },
        request: {
          body: {
            confirmed: true,
            username: 'testuser',
            email: 'test@example.com',
            password: 'Testpassword1!',
          },
        },
        send: jest.fn(),
      };

      await expect(auth.register(ctx)).rejects.toThrow(errors.ValidationError);
      expect(ctx.send).toHaveBeenCalledTimes(0);
    });

    test('throws ValidationError when passed extra fields when allowedField is []', async () => {
      global.strapi = {
        ...mockStrapi,
        config: {
          get: jest.fn(() => {
            return {
              register: {
                allowedFields: [],
              },
            };
          }),
        },
      };

      const ctx = {
        state: {
          auth: {},
        },
        request: {
          body: {
            confirmed: true,
            username: 'testuser',
            email: 'test@example.com',
            password: 'Testpassword1!',
          },
        },
        send: jest.fn(),
      };

      await expect(auth.register(ctx)).rejects.toThrow(errors.ValidationError);
      expect(ctx.send).toHaveBeenCalledTimes(0);
    });

    test('allows exceptions from config register.allowedFields', async () => {
      global.strapi = {
        ...mockStrapi,
        config: {
          get: jest.fn(() => {
            return {
              register: {
                allowedFields: ['confirmed'],
              },
            };
          }),
        },
      };

      const ctx = {
        state: {
          auth: {},
        },
        request: {
          body: {
            confirmed: true,
            username: 'testuser',
            email: 'test@example.com',
            password: 'Testpassword1!',
          },
        },
        send: jest.fn(),
      };

      await auth.register(ctx);
      expect(ctx.send).toHaveBeenCalledTimes(1);
    });
  });
});
