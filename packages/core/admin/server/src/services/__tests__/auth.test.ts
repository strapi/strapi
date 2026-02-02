import _ from 'lodash';
import { errors } from '@strapi/utils';
import authService from '../auth';

const { validatePassword, hashPassword, checkCredentials, forgotPassword, resetPassword } =
  authService;

describe('Auth', () => {
  describe('checkCredentials', () => {
    test('Fails on not found user, without leaking not found info', async () => {
      const findOne = jest.fn(() => Promise.resolve());

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
      } as any;

      const input = { email: 'test@strapi.io', password: 'pcw123' };
      const res = await checkCredentials(input);

      expect(findOne).toHaveBeenCalledWith({ where: { email: input.email } });
      expect(res).toEqual([null, false, { message: 'Invalid credentials' }]);
    });

    test('Fails when password is invalid, without leaking specific info', async () => {
      const user = {
        id: 1,
        firstname: '',
        lastname: '',
        email: 'test@strapi.io',
        password: await hashPassword('test-password'),
      };

      const findOne = jest.fn(() => Promise.resolve(user));

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
      } as any;

      const input = { email: 'test@strapi.io', password: 'wrong-password' };
      const res = await checkCredentials(input);

      expect(findOne).toHaveBeenCalledWith({ where: { email: input.email } });
      expect(res).toEqual([null, false, { message: 'Invalid credentials' }]);
    });

    test.each([false, null, 1, 0])('Fails when user is not active (%s)', async (isActive) => {
      const user = {
        id: 1,
        firstname: '',
        lastname: '',
        email: 'test@strapi.io',
        isActive,
        password: await hashPassword('test-password'),
      };

      const findOne = jest.fn(() => Promise.resolve(user));

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
      } as any;

      const input = { email: 'test@strapi.io', password: 'test-password' };
      const res = await checkCredentials(input);

      expect(findOne).toHaveBeenCalledWith({ where: { email: input.email } });
      expect(res).toEqual([null, false, { message: 'User not active' }]);
    });

    test('Returns user when all checks pass', async () => {
      const user = {
        id: 1,
        firstname: '',
        lastname: '',
        email: 'test@strapi.io',
        isActive: true,
        password: await hashPassword('test-password'),
      };

      const findOne = jest.fn(() => Promise.resolve(user));

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
      } as any;

      const input = { email: 'test@strapi.io', password: 'test-password' };
      const res = await checkCredentials(input);

      expect(findOne).toHaveBeenCalledWith({ where: { email: input.email } });
      expect(res).toEqual([null, user]);
    });
  });

  describe('validatePassword', () => {
    test('Compares password with hash (matching passwords)', async () => {
      const password = 'pcw123';
      const hash = await hashPassword(password);

      const isValid = await validatePassword(password, hash);
      expect(isValid).toBe(true);
    });

    test('Compares password with hash (not matching passwords)', async () => {
      const password = 'pcw123';
      const password2 = 'pcs1234';
      const hash = await hashPassword(password2);

      const isValid = await validatePassword(password, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('forgotPassword', () => {
    test('Only run the process for active users', async () => {
      const findOne = jest.fn(() => Promise.resolve());

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
      } as any;

      const input = { email: 'test@strapi.io' };
      await forgotPassword(input);

      expect(findOne).toHaveBeenCalledWith({ where: { email: input.email, isActive: true } });
    });

    test('Will return silently in case the user is not found', async () => {
      const findOne = jest.fn(() => Promise.resolve());
      const send = jest.fn(() => Promise.resolve());

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
        plugins: {
          email: {
            services: {
              email: { send },
            },
          },
        },
      } as any;

      const input = { email: 'test@strapi.io' };
      await forgotPassword(input);

      expect(findOne).toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    });

    test('Will assign a new reset token', async () => {
      const user = {
        id: 1,
        email: 'test@strapi.io',
      };
      const resetPasswordToken = '123';

      const findOne = jest.fn(() => Promise.resolve(user));
      const send = jest.fn(() => Promise.resolve());
      const updateById = jest.fn(() => Promise.resolve());
      const createToken = jest.fn(() => resetPasswordToken);

      const config = {
        server: {
          host: '0.0.0.0',
        },
        admin: { url: '/admin' },
      };

      global.strapi = {
        config: {
          ...config,
          get(path: any, def: any) {
            return _.get(path, def);
          },
        },
        db: {
          query() {
            return { findOne };
          },
        },
        admin: { services: { user: { updateById }, token: { createToken } } },
        plugins: { email: { services: { email: { send, sendTemplatedEmail: send } } } },
      } as any;

      const input = { email: user.email };
      await forgotPassword(input);

      expect(findOne).toHaveBeenCalled();
      expect(createToken).toHaveBeenCalled();
      expect(updateById).toHaveBeenCalledWith(user.id, { resetPasswordToken });
    });

    test('Will call the send service', async () => {
      const user = {
        id: 1,
        email: 'test@strapi.io',
      };
      const resetPasswordToken = '123';

      const findOne = jest.fn(() => Promise.resolve(user));
      const send = jest.fn(() => Promise.resolve());
      const sendTemplatedEmail = jest.fn(() => Promise.resolve());
      const updateById = jest.fn(() => Promise.resolve());
      const createToken = jest.fn(() => resetPasswordToken);

      const config = {
        server: {
          host: '0.0.0.0',
          admin: { url: '/admin', forgotPassword: { emailTemplate: {} } },
        },
      };

      global.strapi = {
        config: {
          ...config,
          get(path: any, def: any) {
            return _.get(path, def);
          },
        },
        db: {
          query() {
            return { findOne };
          },
        },
        admin: {
          services: {
            user: { updateById },
            token: { createToken },
          },
        },
        plugins: { email: { services: { email: { send, sendTemplatedEmail } } } },
      } as any;

      const input = { email: user.email };
      await forgotPassword(input);

      expect(findOne).toHaveBeenCalled();
      expect(createToken).toHaveBeenCalled();
      expect(sendTemplatedEmail).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    test('Check user is active', async () => {
      const resetPasswordToken = '123';
      const findOne = jest.fn(() => Promise.resolve());

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
      } as any;

      expect.assertions(2);

      try {
        await resetPassword({ resetPasswordToken, password: 'Test1234' });
      } catch (e) {
        expect(e instanceof errors.ApplicationError).toBe(true);
      }

      expect(findOne).toHaveBeenCalledWith({ where: { resetPasswordToken, isActive: true } });
    });

    test('Fails if user is not found', async () => {
      const resetPasswordToken = '123';
      const findOne = jest.fn(() => Promise.resolve());

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
      } as any;

      expect.assertions(1);

      try {
        await resetPassword({ resetPasswordToken, password: 'Test1234' });
      } catch (e) {
        expect(e instanceof errors.ApplicationError).toBe(true);
      }
    });

    test('Changes password and clear reset token', async () => {
      const resetPasswordToken = '123';
      const user = { id: 1 };

      const findOne = jest.fn(() => Promise.resolve(user));
      const updateById = jest.fn(() => Promise.resolve());

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
        admin: { services: { user: { updateById } } },
      } as any;

      const input = { resetPasswordToken, password: 'Test1234' };
      await resetPassword(input);

      expect(updateById).toHaveBeenCalledWith(user.id, {
        password: input.password,
        resetPasswordToken: null,
      });
    });
  });
});
