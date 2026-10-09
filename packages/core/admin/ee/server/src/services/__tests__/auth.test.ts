import authService from '../auth';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  emitAudit: jest.fn(),
}));

jest.mock('../../utils/sso-lock', () => ({
  isSsoLocked: jest.fn(async () => false),
}));

const { forgotPassword } = authService;

describe('EE auth service', () => {
  describe('forgotPassword', () => {
    test('Logs a failed email even when it fails after teardown', async () => {
      const user = { id: 1, email: 'test@strapi.io' };
      const log = { error: jest.fn() };
      const error = new Error('can not resolve Mx');

      const sendTemplatedEmail = jest.fn(() => {
        // strapi.destroy() deletes the global while the email is in flight. The unit setup
        // defines the global as non-configurable, so swap in an instance with no logger.
        global.strapi = {} as any;
        return Promise.reject(error);
      });

      global.strapi = {
        log,
        config: { get: (_key: string, defaultValue: unknown) => defaultValue },
        db: { query: () => ({ findOne: jest.fn(() => Promise.resolve(user)) }) },
        admin: {
          services: {
            user: {
              updateById: jest.fn((_id, attributes) => Promise.resolve({ ...user, ...attributes })),
            },
            token: { createToken: jest.fn(() => 'token') },
          },
        },
        plugins: { email: { services: { email: { sendTemplatedEmail } } } },
      } as any;

      await expect(forgotPassword({ email: user.email })).resolves.toBeUndefined();

      expect(log.error).toHaveBeenCalledWith(error);
    });
  });
});
