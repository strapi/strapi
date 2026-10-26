import { EnterpriseInstallError } from '../errors';
import { resolveRegistryUrl } from '../registry-url';
import { createTestLogger, loggedText } from './test-helpers';

const resolve = (registryUrlOverride: string) =>
  resolveRegistryUrl({
    env: { STRAPI_ENTERPRISE_REGISTRY_URL: registryUrlOverride },
    logger: createTestLogger(),
  });

describe('resolveRegistryUrl', () => {
  it.each([
    [{}],
    [{ STRAPI_ENTERPRISE_REGISTRY_URL: '' }],
    [{ STRAPI_ENTERPRISE_REGISTRY_URL: '   ' }],
  ])(
    'uses the Strapi registry, and warns nothing, when the variable is unset or blank (%j)',
    (env) => {
      const logger = createTestLogger();

      expect(resolveRegistryUrl({ env, logger })).toBe('https://packages.strapi.io');
      expect(logger.warn).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['http://localhost:4873/', 'http://localhost:4873'],
    ['http://127.0.0.1:4873', 'http://127.0.0.1:4873'],
    ['https://registry.example.com/npm/', 'https://registry.example.com/npm'],
    ['HTTP://LOCALHOST:4873/', 'http://localhost:4873'],
    ['  https://Registry.Example.com  ', 'https://registry.example.com'],
  ])('uses %j, and warns that it does', (registryUrlOverride, registryUrl) => {
    const logger = createTestLogger();

    expect(
      resolveRegistryUrl({
        env: { STRAPI_ENTERPRISE_REGISTRY_URL: registryUrlOverride },
        logger,
      })
    ).toBe(registryUrl);
    expect(logger.warn).toHaveBeenCalledWith(
      `Using the Enterprise registry at ${registryUrl} (STRAPI_ENTERPRISE_REGISTRY_URL).`
    );
  });

  it('stops on a value that is not a URL', () => {
    expect(() => resolve('registry.example.com')).toThrow(
      new EnterpriseInstallError('STRAPI_ENTERPRISE_REGISTRY_URL is not a valid URL.')
    );
  });

  it.each(['https://user:pw@registry.example.com', 'http://user:pw@registry.example.com'])(
    'stops on a user name or a password in %s, without showing them',
    (registryUrlOverride) => {
      const logger = createTestLogger();
      let error: unknown;

      try {
        resolveRegistryUrl({
          env: { STRAPI_ENTERPRISE_REGISTRY_URL: registryUrlOverride },
          logger,
        });
      } catch (thrownError) {
        error = thrownError;
      }

      expect(error).toEqual(
        new EnterpriseInstallError(
          'STRAPI_ENTERPRISE_REGISTRY_URL must not contain a user name or a password.'
        )
      );
      expect((error as Error).message).not.toContain('pw');
      expect(loggedText(logger)).not.toContain('pw');
    }
  );

  it.each([
    'https://registry.example.com/?a=1',
    'https://registry.example.com/#npm',
    'https://registry.example.com/?',
  ])('stops on a query string or a fragment in %s', (registryUrlOverride) => {
    expect(() => resolve(registryUrlOverride)).toThrow(
      new EnterpriseInstallError(
        'STRAPI_ENTERPRISE_REGISTRY_URL must not contain a query string or a fragment.'
      )
    );
  });

  it.each([
    'http://registry.example.com',
    'http://192.168.1.10:4873',
    'ftp://localhost',
    'localhost:4873',
  ])('stops on %s, since the license is sent to it', (registryUrlOverride) => {
    expect(() => resolve(registryUrlOverride)).toThrow(
      new EnterpriseInstallError(
        'STRAPI_ENTERPRISE_REGISTRY_URL must use https, or http on localhost or 127.0.0.1, because the license is sent to it.'
      )
    );
  });
});
