import { hasValidTokenSalt, isRemoteTransferEnabled } from '../../transfer/utils';

const setup = ({ salt, remoteEnabled }: { salt: unknown; remoteEnabled: boolean }) => {
  const config: Record<string, unknown> = {
    'admin.transfer.token.salt': salt,
    'server.transfer.remote.enabled': remoteEnabled,
  };
  const warn = jest.fn();

  global.strapi = {
    config: { get: (key: string, defaultValue?: unknown) => config[key] ?? defaultValue },
    log: { warn },
    admin: { services: { transfer: { utils: { hasValidTokenSalt } } } },
  } as any;

  return { warn };
};

describe('transfer utils', () => {
  const { STRAPI_DISABLE_REMOTE_DATA_TRANSFER } = process.env;

  afterEach(() => {
    if (STRAPI_DISABLE_REMOTE_DATA_TRANSFER === undefined) {
      delete process.env.STRAPI_DISABLE_REMOTE_DATA_TRANSFER;
    } else {
      process.env.STRAPI_DISABLE_REMOTE_DATA_TRANSFER = STRAPI_DISABLE_REMOTE_DATA_TRANSFER;
    }
  });

  describe('hasValidTokenSalt', () => {
    test.each([
      ['a non-empty string', 'salt', true],
      ['an empty string', '', false],
      ['a non-string value', 42, false],
      ['no value', undefined, false],
    ])('with %s is %s', (_label, salt, expected) => {
      setup({ salt, remoteEnabled: true });

      expect(hasValidTokenSalt()).toBe(expected);
    });
  });

  describe('isRemoteTransferEnabled', () => {
    test('is enabled with a valid salt and the remote transfer enabled', () => {
      setup({ salt: 'salt', remoteEnabled: true });

      expect(isRemoteTransferEnabled()).toBe(true);
    });

    test('is disabled without a valid salt', () => {
      setup({ salt: '', remoteEnabled: true });

      expect(isRemoteTransferEnabled()).toBe(false);
    });

    test('is disabled when the server config turns the remote transfer off', () => {
      setup({ salt: 'salt', remoteEnabled: false });

      expect(isRemoteTransferEnabled()).toBe(false);
    });

    test('warns that the STRAPI_DISABLE_REMOTE_DATA_TRANSFER variable is ignored', () => {
      process.env.STRAPI_DISABLE_REMOTE_DATA_TRANSFER = 'true';
      const { warn } = setup({ salt: 'salt', remoteEnabled: true });

      expect(isRemoteTransferEnabled()).toBe(true);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('STRAPI_DISABLE_REMOTE_DATA_TRANSFER is no longer supported')
      );
    });
  });
});
