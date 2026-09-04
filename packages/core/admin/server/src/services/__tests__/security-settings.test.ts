import type { Core } from '@strapi/types';
import {
  DEFAULT_MFA_ENFORCEMENT,
  SECURITY_SETTINGS_KEY,
  readMfaEnforcement,
} from '../security-settings';

const buildStrapi = (stored: unknown) => {
  const get = jest.fn(async ({ key }: { key: string }) =>
    key === SECURITY_SETTINGS_KEY ? stored : null
  );
  const store = jest.fn(() => ({ get, set: jest.fn() }));
  return { strapi: { store, log: { warn: jest.fn() } } as unknown as Core.Strapi, store, get };
};

describe('security-settings: readMfaEnforcement', () => {
  test('defaults to optional / 7 days when nothing is stored', async () => {
    const { strapi, store } = buildStrapi(null);

    await expect(readMfaEnforcement(strapi)).resolves.toEqual(DEFAULT_MFA_ENFORCEMENT);
    expect(store).toHaveBeenCalledWith({ type: 'core', name: 'admin' });
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('returns the stored mode and grace period', async () => {
    const { strapi } = buildStrapi({ mfa: { mode: 'required', graceDays: 3 } });

    await expect(readMfaEnforcement(strapi)).resolves.toEqual({ mode: 'required', graceDays: 3 });
  });

  test('a stored document missing a key falls back per key', async () => {
    const { strapi } = buildStrapi({ mfa: { mode: 'off' } });

    await expect(readMfaEnforcement(strapi)).resolves.toEqual({ mode: 'off', graceDays: 7 });
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  test('a corrupt stored value is ignored with a warning, never thrown', async () => {
    const { strapi } = buildStrapi({ mfa: { mode: 'sometimes', graceDays: 'soon' } });

    await expect(readMfaEnforcement(strapi)).resolves.toEqual(DEFAULT_MFA_ENFORCEMENT);
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringMatching(/security-settings/));
  });
});
