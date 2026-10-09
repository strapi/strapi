/* eslint-env jest */

// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import { getService } from '../../utils';
import authenticationController from '../authentication';

jest.mock('../../utils', () => ({
  getService: jest.fn(),
}));

jest.mock('../../validation/authentication', () => ({
  validateRegistrationInput: jest.fn(),
  validateAdminRegistrationInput: jest.fn(),
  validateRegistrationInfoQuery: jest.fn(),
  validateForgotPasswordInput: jest.fn(),
  validateResetPasswordInput: jest.fn(),
  validateLoginSessionInput: jest.fn(),
}));

jest.mock('../../services/auth', () => ({
  USER_NOT_ACTIVE_MESSAGE: 'User not active',
}));

jest.mock('../../audit-logs/auth', () => ({
  emitLoginFailure: jest.fn(),
}));

const mockGetService = jest.mocked(getService);

const setStrapi = (value: object) => {
  (globalThis as any).strapi = value;
};

const flushPromises = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

describe('Authentication Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete (globalThis as any).strapi;
  });

  describe('forgotPassword', () => {
    test('Answers before the email is sent and does not log a successful request', async () => {
      const log = { error: jest.fn() };
      let resolveForgotPassword: () => void = () => {};
      const forgotPassword = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveForgotPassword = resolve;
          })
      );

      setStrapi({ log });
      mockGetService.mockReturnValue({ forgotPassword } as any);

      const ctx = createContext({ body: { email: 'admin@example.com' } }) as any;

      await authenticationController.forgotPassword(ctx);

      expect(ctx.status).toBe(204);
      expect(forgotPassword).toHaveBeenCalledWith({ email: 'admin@example.com' });

      resolveForgotPassword();
      await flushPromises();

      expect(log.error).not.toHaveBeenCalled();
    });

    test('Logs a failure that happens after the Strapi instance has been destroyed', async () => {
      const log = { error: jest.fn() };
      let rejectForgotPassword: (error: Error) => void = () => {};
      const forgotPassword = jest.fn(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectForgotPassword = reject;
          })
      );

      setStrapi({ log });
      mockGetService.mockReturnValue({ forgotPassword } as any);

      const ctx = createContext({ body: { email: 'admin@example.com' } }) as any;

      await authenticationController.forgotPassword(ctx);

      expect(ctx.status).toBe(204);

      // The instance is destroyed (e.g. the server is shutting down) before the email
      // provider gives up: the `strapi` global is gone when the rejection lands.
      delete (globalThis as any).strapi;

      const error = new Error('SMTP server unreachable');
      rejectForgotPassword(error);
      await flushPromises();

      expect(log.error).toHaveBeenCalledWith('Failed to process the forgot-password request', {
        error,
      });
    });
  });
});
