/**
 * The license registry has shipped numeric feature options as strings (`maximumReleases: "90"`).
 * Readers of `features.get(...).options` compare them with numbers, so the exposed options must
 * hold numbers. Each test re-imports the module because it keeps its license in a singleton.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

vi.mock('../license', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../license')>()),
  verifyLicense: vi.fn(),
}));

type EEModule = typeof import('../index').default;

const loadLicense = async (features: unknown[]): Promise<EEModule> => {
  vi.resetModules();
  (global as any).strapi = { eventHub: { emit: vi.fn() } };

  const license = (await import('../license')) as unknown as { verifyLicense: Mock };
  license.verifyLicense.mockReturnValue({ type: 'gold', isTrial: false, features });

  const eeModule: EEModule = (await import('../index')).default;
  eeModule.init('/fake/license/dir');

  return eeModule;
};

describe('ee feature options', () => {
  beforeEach(() => {
    process.env.STRAPI_LICENSE = 'fake-license-blob';
  });

  afterEach(() => {
    delete process.env.STRAPI_LICENSE;
    delete (global as any).strapi;
  });

  it('exposes numeric string options as numbers', async () => {
    const eeModule = await loadLicense([
      { name: 'cms-content-releases', options: { maximumReleases: '90' } },
      { name: 'audit-logs', options: { retentionDays: ' 30 ' } },
    ]);

    expect(eeModule.features.get('cms-content-releases')).toEqual({
      name: 'cms-content-releases',
      options: { maximumReleases: 90 },
    });
    expect(eeModule.features.list()).toContainEqual({
      name: 'audit-logs',
      options: { retentionDays: 30 },
    });
  });

  it('keeps other option values unchanged', async () => {
    const eeModule = await loadLicense([
      'sso',
      {
        name: 'cms-content-releases',
        options: { maximumReleases: 5, label: 'ninety', empty: '', flag: true, nothing: null },
      },
      { name: 'review-workflows' },
    ]);

    expect(eeModule.features.list()).toEqual([
      { name: 'sso' },
      {
        name: 'cms-content-releases',
        options: { maximumReleases: 5, label: 'ninety', empty: '', flag: true, nothing: null },
      },
      { name: 'review-workflows' },
    ]);
  });

  it('reads plain decimal strings, zero included', async () => {
    const eeModule = await loadLicense([
      {
        name: 'cms-content-releases',
        options: { maximumReleases: '0', negative: '-2', decimal: '1.5' },
      },
    ]);

    expect(eeModule.features.get('cms-content-releases')?.options).toEqual({
      maximumReleases: 0,
      negative: -2,
      decimal: 1.5,
    });
  });

  it('keeps strings that are not plain finite decimals', async () => {
    const options = {
      infinity: 'Infinity',
      exponent: '1e21',
      hex: '0x10',
      leadingDot: '.5',
      tooLarge: '9'.repeat(400),
    };
    const eeModule = await loadLicense([{ name: 'cms-content-releases', options }]);

    expect(eeModule.features.get('cms-content-releases')?.options).toEqual(options);
  });

  it('keeps numeric options as numbers once serialized', async () => {
    const eeModule = await loadLicense([
      { name: 'cms-content-releases', options: { maximumReleases: '90' } },
    ]);

    // The admin license endpoints send `features.list()` as JSON.
    const [feature] = JSON.parse(JSON.stringify(eeModule.features.list()));
    expect(typeof feature.options.maximumReleases).toBe('number');
  });
});
