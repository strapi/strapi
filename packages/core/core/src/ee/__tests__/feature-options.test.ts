/* eslint-disable @typescript-eslint/no-var-requires, node/no-missing-require */
/**
 * The license registry has shipped numeric feature options as strings (`maximumReleases: "90"`).
 * Readers of `features.get(...).options` compare them with numbers, so the exposed options must
 * hold numbers. Each test re-requires the module because it keeps its license in a singleton.
 */

jest.mock('../license', () => ({
  ...jest.requireActual('../license'),
  verifyLicense: jest.fn(),
}));

type EEModule = typeof import('../index').default;

const loadLicense = (features: unknown[]): EEModule => {
  jest.resetModules();
  (global as any).strapi = { eventHub: { emit: jest.fn() } };

  const license = jest.requireMock('../license') as { verifyLicense: jest.Mock };
  license.verifyLicense.mockReturnValue({ type: 'gold', isTrial: false, features });

  const eeModule: EEModule = require('../index').default;
  eeModule.init('/fake/license/dir');

  return eeModule;
};

describe('ee feature options', () => {
  beforeEach(() => {
    process.env.STRAPI_LICENSE = 'fake-license-blob';
  });

  afterEach(() => {
    delete process.env.STRAPI_LICENSE;
  });

  it('exposes numeric string options as numbers', () => {
    const eeModule = loadLicense([
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

  it('keeps other option values unchanged', () => {
    const eeModule = loadLicense([
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
});
