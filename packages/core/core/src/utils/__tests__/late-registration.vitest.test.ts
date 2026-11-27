import { describe, expect, test, vi } from 'vitest';

import { warnLateRegistration, type LateRegistration } from '../late-registration';

const createStrapi = (environment: string | undefined) =>
  ({
    config: { get: (key: string) => (key === 'environment' ? environment : undefined) },
    log: { warn: vi.fn() },
  }) as any;

const registration: LateRegistration = {
  surface: 'routes',
  key: 'plugin::foo:content-api:GET /late',
  subject: 'Route "GET /late" of plugin::foo',
  closedBy: 'Strapi registered the routes',
  effect: 'Strapi does not serve it',
  registerIn: 'from a register function',
};

describe('warnLateRegistration', () => {
  test('warns with what was registered, what closed the window and where to register instead', () => {
    const strapi = createStrapi('development');

    warnLateRegistration(strapi, registration);

    expect(strapi.log.warn).toHaveBeenCalledWith(
      '[strapi] Route "GET /late" of plugin::foo was registered after Strapi registered the routes: Strapi does not serve it. Register it from a register function.'
    );
  });

  test('warns once per surface and key', () => {
    const strapi = createStrapi('development');

    warnLateRegistration(strapi, registration);
    warnLateRegistration(strapi, { ...registration, subject: 'same key, other wording' });
    warnLateRegistration(strapi, { ...registration, key: 'plugin::foo:content-api:GET /other' });
    warnLateRegistration(strapi, { ...registration, surface: 'other-surface' });

    expect(strapi.log.warn).toHaveBeenCalledTimes(3);
  });

  test('keeps the once-per semantics per Strapi instance', () => {
    const first = createStrapi('development');
    const second = createStrapi('development');

    warnLateRegistration(first, registration);
    warnLateRegistration(second, registration);

    expect(first.log.warn).toHaveBeenCalledTimes(1);
    expect(second.log.warn).toHaveBeenCalledTimes(1);
  });

  test.each(['production', 'test', 'staging', undefined])(
    'does not warn when the environment is %s',
    (environment) => {
      const strapi = createStrapi(environment);

      warnLateRegistration(strapi, registration);

      expect(strapi.log.warn).not.toHaveBeenCalled();
    }
  );

  test('a call outside development does not use up the warning', () => {
    let environment = 'production';
    const strapi = {
      config: { get: () => environment },
      log: { warn: vi.fn() },
    } as any;

    warnLateRegistration(strapi, registration);
    environment = 'development';
    warnLateRegistration(strapi, registration);

    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
  });
});
