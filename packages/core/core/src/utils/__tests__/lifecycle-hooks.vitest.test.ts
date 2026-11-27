import { describe, expect, test, vi } from 'vitest';

import hooksRegistry from '../../registries/hooks';
import { setLifecycleHooks } from '../lifecycle-hooks';

const BEFORE_SYNC = 'strapi::content-types.beforeSync';
const AFTER_SYNC = 'strapi::content-types.afterSync';
const AFTER_BOOTSTRAP = 'strapi::app.afterBootstrap';

const createStrapi = (environment: string = 'development') => {
  const hooks = hooksRegistry();

  const strapi = {
    config: { get: (key: string) => (key === 'environment' ? environment : undefined) },
    log: { warn: vi.fn() },
    get: (name: string) => (name === 'hooks' ? hooks : undefined),
    hook: (uid: string) => hooks.get(uid) as any,
  } as any;

  setLifecycleHooks(strapi);

  return strapi;
};

describe('setLifecycleHooks', () => {
  test('registers the sync and afterBootstrap hooks', () => {
    const strapi = createStrapi();

    expect(strapi.get('hooks').keys()).toEqual([BEFORE_SYNC, AFTER_SYNC, AFTER_BOOTSTRAP]);
  });

  describe.each([BEFORE_SYNC, AFTER_SYNC])('%s', (uid) => {
    test('calls a handler registered before the hook runs, without a warning', async () => {
      const strapi = createStrapi();
      const handler = vi.fn();

      expect(strapi.hook(uid).register(handler)).toBe(strapi.hook(uid));
      const context = { contentTypes: {} };
      await strapi.hook(uid).call(context);

      expect(handler).toHaveBeenCalledWith(context);
      expect(strapi.log.warn).not.toHaveBeenCalled();
    });

    test('warns once about handlers registered after the hook ran, and still does not call them', async () => {
      const strapi = createStrapi();
      await strapi.hook(uid).call({});

      const late = vi.fn();
      expect(strapi.hook(uid).register(late)).toBe(strapi.hook(uid));
      strapi.hook(uid).register(vi.fn());

      expect(strapi.log.warn).toHaveBeenCalledTimes(1);
      expect(strapi.log.warn).toHaveBeenCalledWith(
        `[strapi] A handler of the "${uid}" hook was registered after Strapi called this hook during the database schema sync: Strapi does not call it. Register it from a register function.`
      );
      expect(strapi.hook(uid).getHandlers()).toContain(late);
      expect(late).not.toHaveBeenCalled();
    });

    test('warns about a handler registered while the hook runs: the hook does not call it', async () => {
      const strapi = createStrapi();
      const late = vi.fn();
      strapi.hook(uid).register(() => {
        strapi.hook(uid).register(late);
      });

      await strapi.hook(uid).call({});

      expect(late).not.toHaveBeenCalled();
      expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe(AFTER_BOOTSTRAP, () => {
    test('calls handlers registered before and while the hook runs, without a warning', async () => {
      const strapi = createStrapi();
      const nested = vi.fn();
      strapi.hook(AFTER_BOOTSTRAP).register(() => {
        strapi.hook(AFTER_BOOTSTRAP).register(nested);
      });

      await strapi.hook(AFTER_BOOTSTRAP).call();

      expect(nested).toHaveBeenCalledTimes(1);
      expect(strapi.log.warn).not.toHaveBeenCalled();
    });

    test('warns once about handlers registered after the hook ran, and still does not call them', async () => {
      const strapi = createStrapi();
      await strapi.hook(AFTER_BOOTSTRAP).call();

      const late = vi.fn();
      strapi.hook(AFTER_BOOTSTRAP).register(late);
      strapi.hook(AFTER_BOOTSTRAP).register(vi.fn());

      expect(strapi.log.warn).toHaveBeenCalledTimes(1);
      expect(strapi.log.warn).toHaveBeenCalledWith(
        `[strapi] A handler of the "${AFTER_BOOTSTRAP}" hook was registered after Strapi called this hook at the end of bootstrap: Strapi does not call it. Register it from a register or bootstrap function.`
      );
      expect(strapi.hook(AFTER_BOOTSTRAP).getHandlers()).toContain(late);
      expect(late).not.toHaveBeenCalled();
    });
  });

  test('warns once per hook', async () => {
    const strapi = createStrapi();
    await strapi.hook(BEFORE_SYNC).call({});
    await strapi.hook(AFTER_SYNC).call({});

    strapi.hook(BEFORE_SYNC).register(vi.fn());
    strapi.hook(AFTER_SYNC).register(vi.fn());
    strapi.hook(AFTER_SYNC).register(vi.fn());

    expect(strapi.log.warn).toHaveBeenCalledTimes(2);
  });

  test.each(['production', 'test', 'staging'])('is silent in the %s environment', async (env) => {
    const strapi = createStrapi(env);
    await strapi.hook(AFTER_SYNC).call({});
    await strapi.hook(AFTER_BOOTSTRAP).call();

    strapi.hook(AFTER_SYNC).register(vi.fn());
    strapi.hook(AFTER_BOOTSTRAP).register(vi.fn());

    expect(strapi.log.warn).not.toHaveBeenCalled();
  });
});
