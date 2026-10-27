import { EnterpriseInstallError } from '../errors';
import { resolveRegistryUrl } from '../registry-url';
import { createTestLogger, loggedText } from './test-helpers';

const resolve = (registry: string) => resolveRegistryUrl({ registry, logger: createTestLogger() });

describe('resolveRegistryUrl', () => {
  it('uses the Strapi registry, and warns nothing, without --registry', () => {
    const logger = createTestLogger();

    expect(resolveRegistryUrl({ registry: undefined, logger })).toBe('https://packages.strapi.io');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each(['', '   '])('stops on an empty --registry (%j)', (registry) => {
    expect(() => resolve(registry)).toThrow(
      new EnterpriseInstallError('--registry must not be empty.')
    );
  });

  it.each([
    ['http://localhost:4873/', 'http://localhost:4873'],
    ['http://127.0.0.1:4873', 'http://127.0.0.1:4873'],
    ['http://[::1]:4873/', 'http://[::1]:4873'],
    ['http://[0:0:0:0:0:0:0:1]:4873', 'http://[::1]:4873'],
    ['https://registry.example.com/npm/', 'https://registry.example.com/npm'],
    ['HTTP://LOCALHOST:4873/', 'http://localhost:4873'],
    ['  https://Registry.Example.com  ', 'https://registry.example.com'],
  ])('uses %j, and warns that it does', (registry, registryUrl) => {
    const logger = createTestLogger();

    expect(resolveRegistryUrl({ registry, logger })).toBe(registryUrl);
    expect(logger.warn).toHaveBeenCalledWith(
      `Using the Enterprise registry at ${registryUrl} (--registry).`
    );
  });

  it('stops on a value that is not a URL', () => {
    expect(() => resolve('registry.example.com')).toThrow(
      new EnterpriseInstallError('--registry is not a valid URL.')
    );
  });

  it.each(['https://user:pw@registry.example.com', 'http://user:pw@registry.example.com'])(
    'stops on a user name or a password in %s, without showing them',
    (registry) => {
      const logger = createTestLogger();
      let error: unknown;

      try {
        resolveRegistryUrl({ registry, logger });
      } catch (thrownError) {
        error = thrownError;
      }

      expect(error).toEqual(
        new EnterpriseInstallError('--registry must not contain a user name or a password.')
      );
      expect((error as Error).message).not.toContain('pw');
      expect(loggedText(logger)).not.toContain('pw');
    }
  );

  it.each([
    'https://registry.example.com/?a=1',
    'https://registry.example.com/#npm',
    'https://registry.example.com/?',
  ])('stops on a query string or a fragment in %s', (registry) => {
    expect(() => resolve(registry)).toThrow(
      new EnterpriseInstallError('--registry must not contain a query string or a fragment.')
    );
  });

  it.each([
    'http://registry.example.com',
    'http://192.168.1.10:4873',
    'http://[::2]:4873',
    'http://[::ffff:127.0.0.1]:4873',
    'ftp://localhost',
    'localhost:4873',
  ])('stops on %s, since the license is sent to it', (registry) => {
    expect(() => resolve(registry)).toThrow(
      new EnterpriseInstallError(
        '--registry must use https, or http on localhost, 127.0.0.1 or [::1], because the license is sent to it.'
      )
    );
  });
});
