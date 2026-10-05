import { beforeAll, describe, expect, test, vi } from 'vitest';

import { errors } from '@strapi/utils';
import auth from '../../auth';

const mockStrapi = {
  contentAPI: {
    sanitize: {
      output: vi.fn((input) => input),
    },
  },
  store: vi.fn(() => {
    return {
      get: vi.fn(() => {
        return { allow_register: true };
      }),
    };
  }),
  config: {
    get: vi.fn(() => {
      return {
        register: {
          // only set allowedFields on a per-test basis
        },
      };
    }),
  },
  db: {
    query: vi.fn(() => {
      return {
        findOne: vi.fn(() => {
          return {
            role: 1,
          };
        }),
        count: vi.fn(() => {
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
  getModel: vi.fn(),
  plugin: () => ({
    service(service) {
      if (service === 'user') {
        return {
          add: vi.fn((user) => {
            return user;
          }),
          edit: vi.fn(async (id, data) => {
            if (id === 1 && data.password) {
              return { id };
            }
            throw new Error('Failed to edit user');
          }),
          validatePassword: vi.fn((password, userPassword) => {
            return password === userPassword;
          }),
        };
      }
      if (service === 'jwt') {
        return {
          issue: vi.fn((payload) => `fake-jwt-token-for-user-${payload.id}`),
        };
      }
    },
  }),
};

describe('user-permissions auth', () => {
  beforeAll(() => {
    global.strapi = mockStrapi;
  });

  describe('register', () => {
    const registerCases = [
      {
        description: 'Accepts valid registration with a typical password',
        password: 'Testpassword1!',
      },
      {
        description: 'Password is exactly 72 bytes with valid ASCII characters',
        password: 'a'.repeat(72), // 72 ASCII characters
      },
      {
        description:
          'Password is exactly 72 bytes with a mix of multibyte and single-byte characters',
        password: `${'a'.repeat(69)}测`, // 70 single-byte characters + 1 three-byte character 测
      },
    ];

    test.each(registerCases)('$description', async ({ password }) => {
      const ctx = {
        state: {
          auth: {},
        },
        request: {
          body: { username: 'testuser', email: 'test@example.com', password },
        },
        send: vi.fn(),
      };

      const authorization = auth({ strapi: global.strapi });
      await authorization.register(ctx);
      expect(ctx.send).toHaveBeenCalledTimes(1);
    });

    test('throws ValidationError when passed extra fields when allowedField is undefined', async () => {
      global.strapi = {
        ...mockStrapi,
        config: {
          get: vi.fn(() => {
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
        send: vi.fn(),
      };
      const authorization = auth({ strapi: global.strapi });
      await expect(authorization.register(ctx)).rejects.toThrow(errors.ValidationError);
      expect(ctx.send).toHaveBeenCalledTimes(0);
    });

    test('throws ValidationError when passed extra fields when allowedField is []', async () => {
      global.strapi = {
        ...mockStrapi,
        config: {
          get: vi.fn(() => {
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
        send: vi.fn(),
      };
      const authorization = auth({ strapi: global.strapi });
      await expect(authorization.register(ctx)).rejects.toThrow(errors.ValidationError);
      expect(ctx.send).toHaveBeenCalledTimes(0);
    });

    test('allows exceptions from config register.allowedFields', async () => {
      global.strapi = {
        ...mockStrapi,
        config: {
          get: vi.fn(() => {
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
        send: vi.fn(),
      };
      const authorization = auth({ strapi: global.strapi });
      await authorization.register(ctx);
      expect(ctx.send).toHaveBeenCalledTimes(1);
    });

    test('password does not follow custom validation pattern', async () => {
      global.strapi = {
        ...mockStrapi,
        config: {
          get: vi.fn((path) => {
            if (path === 'plugin::users-permissions.validationRules') {
              return {
                validatePassword(value) {
                  // Custom validation logic: at least 1 uppercase, 1 lowercase, and 1 number
                  const hasUpperCase = /[A-Z]/.test(value);
                  const hasLowerCase = /[a-z]/.test(value);
                  const hasNumber = /[0-9]/.test(value);
                  return hasUpperCase && hasLowerCase && hasNumber && value.length >= 6;
                },
              };
            }
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
            username: 'testuser',
            email: 'test@example.com',
            password: 'TestingPassword',
          },
        },
        send: vi.fn(),
      };
      const authorization = auth({ strapi: global.strapi });
      await expect(authorization.register(ctx)).rejects.toThrow(errors.ValidationError);
      expect(ctx.send).toHaveBeenCalledTimes(0);
    });

    test('password follows custom validation pattern', async () => {
      global.strapi = {
        ...mockStrapi,
        config: {
          get: vi.fn((path) => {
            if (path === 'plugin::users-permissions.validationRules') {
              return {
                validatePassword(value) {
                  // Custom validation logic: at least 1 uppercase, 1 lowercase, and 1 number
                  const hasUpperCase = /[A-Z]/.test(value);
                  const hasLowerCase = /[a-z]/.test(value);
                  const hasNumber = /[0-9]/.test(value);
                  return hasUpperCase && hasLowerCase && hasNumber && value.length >= 6;
                },
              };
            }
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
            username: 'testuser',
            email: 'test@example.com',
            password: 'Password123',
          },
        },
        send: vi.fn(),
      };
      const authorization = auth({ strapi: global.strapi });
      await authorization.register(ctx);
      expect(ctx.send).toHaveBeenCalledTimes(1);
    });

    const cases = [
      {
        description: 'Password is exactly 73 bytes with valid ASCII characters',
        password: `a${'b'.repeat(72)}`, // 1 byte ('a') + 72 bytes ('b') = 73 bytes
        expectedMessage: 'Password must be less than 73 bytes',
      },
      {
        description: 'Password is 73 bytes but contains a character cut in half (UTF-8)',
        password: `a${'b'.repeat(70)}=\uD83D`, // 1 byte ('a') + 70 bytes ('b') + 3 bytes for half of a surrogate pair
        expectedMessage: 'Password must be less than 73 bytes',
      },
      {
        description: 'Password is 73 bytes but contains a character cut in half (UTF-8)',
        password: `${'a'.repeat(70)}测`, // 1 byte ('a') + 70 bytes ('b') + 3 bytes for 测
        expectedMessage: 'Password must be less than 73 bytes',
      },
    ];

    test.each(cases)('$description', async ({ password, expectedMessage }) => {
      global.strapi = {
        ...mockStrapi,
        config: {
          get: vi.fn(() => {
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
            username: 'testuser',
            email: 'test@example.com',
            password,
          },
        },
        send: vi.fn(),
      };

      const authorization = auth({ strapi: global.strapi });

      await expect(authorization.register(ctx)).rejects.toThrow(errors.ValidationError);
      try {
        await authorization.register(ctx);
      } catch (error) {
        expect(error.message).toBe(expectedMessage);
      }

      expect(ctx.send).toHaveBeenCalledTimes(0);
    });
  });

  describe('resetPassword', () => {
    const resetPasswordCases = [
      {
        description: 'Fails if passwords do not match',
        body: {
          password: 'NewPassword123',
          passwordConfirmation: 'DifferentPassword123',
          code: 'valid-reset-token',
        },
        expectedMessage: 'Passwords do not match',
      },
      {
        description: 'Fails if reset token is invalid',
        body: {
          password: 'NewPassword123',
          passwordConfirmation: 'NewPassword123',
          code: 'invalid-reset-token',
        },
        expectedMessage: 'Incorrect code provided',
      },
      {
        description: 'Successfully resets the password with valid input',
        body: {
          password: 'NewPassword123',
          passwordConfirmation: 'NewPassword123',
          code: 'valid-reset-token',
        },
        expectedResponse: {
          jwt: 'fake-jwt-token-for-user-1',
          user: { id: 1 },
        },
      },
      {
        description: 'Successfully resets the password when password is exactly 72 bytes',
        body: {
          password: 'a'.repeat(72),
          passwordConfirmation: 'a'.repeat(72),
          code: 'valid-reset-token',
        },
        expectedResponse: {
          jwt: 'fake-jwt-token-for-user-1',
          user: { id: 1 },
        },
      },
      {
        description: 'Fails if password exceeds 72 bytes',
        body: {
          password: 'a'.repeat(73),
          passwordConfirmation: 'a'.repeat(73),
          code: 'valid-reset-token',
        },
        expectedMessage: 'Password must be less than 73 bytes',
      },
    ];

    test.each(resetPasswordCases)(
      '$description',
      async ({ body, expectedMessage, expectedResponse }) => {
        global.strapi = {
          ...mockStrapi,
          db: {
            query: vi.fn(() => ({
              findOne: vi.fn((query) => {
                if (query.where.resetPasswordToken === 'valid-reset-token') {
                  return { id: 1, resetPasswordToken: 'valid-reset-token' };
                }
                return null;
              }),
            })),
          },
          services: {
            user: {
              edit: vi.fn(async (id, data) => {
                if (id === 1 && data.password) {
                  return { id, ...data }; // Simulate successful password update
                }
                throw new Error('Failed to edit user');
              }),
            },
            jwt: {
              issue: vi.fn((payload) => `fake-jwt-token-for-user-${payload.id}`),
            },
          },
          contentAPI: {
            sanitize: {
              output: vi.fn((user) => {
                // Simulate sanitizing the user object
                const { resetPasswordToken: _resetPasswordToken, ...sanitizedUser } = user;
                return sanitizedUser;
              }),
            },
          },
        };

        const ctx = {
          request: { body },
          state: {
            auth: {},
          },
          send: vi.fn(),
        };

        const authorization = auth({ strapi: global.strapi });

        if (expectedMessage) {
          await expect(authorization.resetPassword(ctx)).rejects.toThrowError(
            expect.objectContaining({
              name: 'ValidationError',
              message: expectedMessage,
            })
          );
          expect(ctx.send).toHaveBeenCalledTimes(0);
        } else {
          await authorization.resetPassword(ctx);
          expect(ctx.send).toHaveBeenCalledWith(expectedResponse);
        }
      }
    );
  });

  describe('changePassword', () => {
    const changePasswordCases = [
      {
        description: 'Fails if current password is incorrect',
        body: {
          currentPassword: 'WrongPassword123',
          password: 'NewPassword123',
          passwordConfirmation: 'NewPassword123',
        },
        expectedMessage: 'The provided current password is invalid',
      },
      {
        description: 'Fails if new password is the same as the current password',
        body: {
          currentPassword: 'CorrectPassword123',
          password: 'CorrectPassword123',
          passwordConfirmation: 'CorrectPassword123',
        },
        expectedMessage: 'Your new password must be different than your current password',
      },
      {
        description: 'Successfully changes the password with valid input',
        body: {
          currentPassword: 'CorrectPassword123',
          password: 'NewPassword123',
          passwordConfirmation: 'NewPassword123',
        },
        expectedResponse: {
          jwt: 'fake-jwt-token-for-user-1',
          user: { id: 1, password: 'CorrectPassword123' },
        },
      },
      {
        description: 'Successfully changes the password when password is exactly 72 bytes',
        body: {
          currentPassword: 'CorrectPassword123',
          password: 'a'.repeat(72),
          passwordConfirmation: 'a'.repeat(72),
        },
        expectedResponse: {
          jwt: 'fake-jwt-token-for-user-1',
          user: { id: 1, password: 'CorrectPassword123' },
        },
      },
      {
        description: 'Fails if password exceeds 72 bytes',
        body: {
          currentPassword: 'CorrectPassword123',
          password: 'a'.repeat(73),
          passwordConfirmation: 'a'.repeat(73),
        },
        expectedMessage: 'Password must be less than 73 bytes',
      },
    ];

    test.each(changePasswordCases)(
      '$description',
      async ({ body, expectedMessage, expectedResponse }) => {
        global.strapi = {
          ...mockStrapi,
          db: {
            query: vi.fn(() => ({
              findOne: vi.fn(() => {
                return {
                  id: 1,
                  password: 'CorrectPassword123', // Simulated hashed password
                };
              }),
            })),
          },
          services: {
            user: {
              validatePassword: vi.fn(async (providedPassword, actualPassword) => {
                return providedPassword === actualPassword;
              }),
              edit: vi.fn(async (id, data) => {
                if (id === 1 && data.password) {
                  return { id, ...data };
                }
                throw new Error('Failed to edit user');
              }),
            },
            jwt: {
              issue: vi.fn((payload) => `fake-jwt-token-for-user-${payload.id}`),
            },
          },
          contentAPI: {
            sanitize: {
              output: vi.fn((user) => {
                return user;
              }),
            },
          },
        };

        const ctx = {
          state: {
            user: { id: 1 },
          },
          request: { body },
          send: vi.fn(),
        };

        const authorization = auth({ strapi: global.strapi });

        if (expectedMessage) {
          await expect(authorization.changePassword(ctx)).rejects.toThrow(expectedMessage);
          expect(ctx.send).toHaveBeenCalledTimes(0);
        } else {
          await authorization.changePassword(ctx);
          expect(ctx.send).toHaveBeenCalledWith(expectedResponse);
        }
      }
    );

    describe('refresh mode session invalidation', () => {
      test('invalidates all sessions when changing password in refresh mode', async () => {
        const invalidateRefreshToken = vi.fn(() => Promise.resolve());
        const generateRefreshToken = vi.fn(() => Promise.resolve({ token: 'new-refresh-token' }));
        const generateAccessToken = vi.fn(() => Promise.resolve({ token: 'new-access-token' }));

        global.strapi = {
          ...mockStrapi,
          config: {
            get: vi.fn((path) => {
              if (path === 'plugin::users-permissions.jwtManagement') {
                return 'refresh';
              }
              return {};
            }),
          },
          db: {
            query: vi.fn(() => ({
              findOne: vi.fn(() => ({
                id: 1,
                password: 'CorrectPassword123',
              })),
            })),
          },
          sessionManager: vi.fn(() => ({
            invalidateRefreshToken,
            generateRefreshToken,
            generateAccessToken,
          })),
          contentAPI: {
            sanitize: {
              output: vi.fn((user) => user),
            },
          },
        };

        const ctx = {
          state: { user: { id: 1 } },
          request: {
            body: {
              currentPassword: 'CorrectPassword123',
              password: 'NewPassword123',
              passwordConfirmation: 'NewPassword123',
            },
          },
          send: vi.fn(),
        };

        const authorization = auth({ strapi: global.strapi });
        await authorization.changePassword(ctx);

        // Should invalidate all sessions (called without deviceId)
        expect(invalidateRefreshToken).toHaveBeenCalledWith('1');
        expect(generateRefreshToken).toHaveBeenCalled();
        expect(ctx.send).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('resetPassword refresh mode', () => {
    test('invalidates all sessions when resetting password in refresh mode', async () => {
      const invalidateRefreshToken = vi.fn(() => Promise.resolve());
      const generateRefreshToken = vi.fn(() => Promise.resolve({ token: 'new-refresh-token' }));
      const generateAccessToken = vi.fn(() => Promise.resolve({ token: 'new-access-token' }));

      global.strapi = {
        ...mockStrapi,
        config: {
          get: vi.fn((path) => {
            if (path === 'plugin::users-permissions.jwtManagement') {
              return 'refresh';
            }
            return {};
          }),
        },
        db: {
          query: vi.fn(() => ({
            findOne: vi.fn((query) => {
              if (query.where.resetPasswordToken === 'valid-reset-token') {
                return { id: 1, resetPasswordToken: 'valid-reset-token' };
              }
              return null;
            }),
          })),
        },
        sessionManager: vi.fn(() => ({
          invalidateRefreshToken,
          generateRefreshToken,
          generateAccessToken,
        })),
        contentAPI: {
          sanitize: {
            output: vi.fn((user) => user),
          },
        },
      };

      const ctx = {
        state: { auth: {} },
        request: {
          body: {
            password: 'NewPassword123',
            passwordConfirmation: 'NewPassword123',
            code: 'valid-reset-token',
          },
        },
        send: vi.fn(),
      };

      const authorization = auth({ strapi: global.strapi });
      await authorization.resetPassword(ctx);

      // Should invalidate all sessions (called without deviceId)
      expect(invalidateRefreshToken).toHaveBeenCalledWith('1');
      expect(generateRefreshToken).toHaveBeenCalled();
      expect(ctx.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('refresh', () => {
    test('returns not found when jwtManagement is not refresh mode', async () => {
      global.strapi = {
        ...mockStrapi,
        config: {
          get: vi.fn((key, defaultValue) => {
            if (key === 'plugin::users-permissions.jwtManagement') {
              return defaultValue;
            }
            return defaultValue;
          }),
        },
      };

      const ctx = {
        request: { body: { refreshToken: 'token' } },
        notFound: vi.fn(),
        badRequest: vi.fn(),
      };

      const authorization = auth({ strapi: global.strapi });

      await authorization.refresh(ctx);

      expect(ctx.notFound).toHaveBeenCalled();
      expect(ctx.badRequest).not.toHaveBeenCalled();
    });

    test('returns bad request when refresh token is missing', async () => {
      const rotateRefreshToken = vi.fn();
      const generateAccessToken = vi.fn();

      global.strapi = {
        ...mockStrapi,
        config: {
          get: vi.fn((key, defaultValue) => {
            if (key === 'plugin::users-permissions.jwtManagement') {
              return 'refresh';
            }
            return defaultValue;
          }),
        },
        sessionManager: vi.fn(() => ({
          rotateRefreshToken,
          generateAccessToken,
        })),
      };

      const ctx = {
        request: { body: {} },
        cookies: {
          get: vi.fn(() => undefined),
        },
        badRequest: vi.fn(),
        notFound: vi.fn(),
      };

      const authorization = auth({ strapi: global.strapi });

      await authorization.refresh(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith('Missing refresh token');
      expect(ctx.notFound).not.toHaveBeenCalled();
      expect(rotateRefreshToken).not.toHaveBeenCalled();
      expect(generateAccessToken).not.toHaveBeenCalled();
    });

    test('returns bad request when refresh token is not a string', async () => {
      const rotateRefreshToken = vi.fn();

      global.strapi = {
        ...mockStrapi,
        config: {
          get: vi.fn((key, defaultValue) => {
            if (key === 'plugin::users-permissions.jwtManagement') {
              return 'refresh';
            }
            return defaultValue;
          }),
        },
        sessionManager: vi.fn(() => ({
          rotateRefreshToken,
          generateAccessToken: vi.fn(),
        })),
      };

      const ctx = {
        request: { body: { refreshToken: 123 } },
        cookies: {
          get: vi.fn(() => undefined),
        },
        badRequest: vi.fn(),
        notFound: vi.fn(),
      };

      const authorization = auth({ strapi: global.strapi });

      await authorization.refresh(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith('Missing refresh token');
      expect(rotateRefreshToken).not.toHaveBeenCalled();
    });
  });
});
