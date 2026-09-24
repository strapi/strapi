import type { Core } from '@strapi/types';
import register from '../register';

jest.mock('../graphql', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../utils', () => ({
  getService: jest.fn(() => ({ isLocalizedContentType: jest.fn() })),
}));

it('installs localization during register before database initialization or bootstrap', async () => {
  const install = jest.fn();
  const plugin = jest.fn();
  const strapi = {
    localization: { register: install },
    get: jest.fn(() => ({ add: jest.fn() })),
    contentTypes: {},
    server: { router: { use: jest.fn() } },
    hook: jest.fn(() => ({ register: jest.fn() })),
    plugin,
  } as unknown as Core.Strapi;

  // No db or bootstrap services are available on this fixture.
  await register({ strapi });

  expect(install).toHaveBeenCalledTimes(1);
  const provider: Core.LocalizationProvider = install.mock.calls[0][0];
  expect(provider).toEqual({
    isLocalizedContentType: expect.any(Function),
    getDefaultLocale: expect.any(Function),
    getLocales: expect.any(Function),
    getNestedPopulateOfNonLocalizedAttributes: expect.any(Function),
    getNonLocalizedAttributes: expect.any(Function),
    fillNonLocalizedAttributes: expect.any(Function),
  });
  expect(plugin).not.toHaveBeenCalledWith('i18n');

  plugin.mockReturnValue({ service: () => ({ getDefaultLocale: async () => 'en' }) });
  await expect(provider.getDefaultLocale()).resolves.toBe('en');
});
