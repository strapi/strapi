import { resolvePluginStatus } from '../plugin-status';
import type { PackumentLookup } from '../registry';
import { createPackument } from './test-helpers';

const threeVersions: PackumentLookup = {
  status: 'available',
  packument: createPackument('@strapi-enterprise/plugin-ai-byok', [
    { version: '1.1.0', strapiRange: '^5.52.0' },
    { version: '1.2.0', strapiRange: '^5.54.0' },
    { version: '1.3.0', strapiRange: '^5.56.0' },
  ]),
};

describe('resolvePluginStatus', () => {
  it('picks the newest version for this Strapi version, noting the newer one', () => {
    expect(resolvePluginStatus({ lookup: threeVersions, strapiVersion: '5.54.1' })).toEqual({
      state: 'install',
      targetVersion: '1.2.0',
      note: '1.3.0 is available but requires Strapi ^5.56.0.',
    });
  });

  it('tells an upgrade from an installed, up-to-date version', () => {
    expect(
      resolvePluginStatus({
        lookup: threeVersions,
        installedVersion: '1.1.0',
        strapiVersion: '5.54.1',
      })
    ).toMatchObject({ state: 'upgrade', targetVersion: '1.2.0' });
    expect(
      resolvePluginStatus({
        lookup: threeVersions,
        installedVersion: '1.2.0',
        strapiVersion: '5.54.1',
      })
    ).toMatchObject({ state: 'installed' });
  });

  it('reports no compatible version, whether the plugin is installed or not', () => {
    expect(
      resolvePluginStatus({
        lookup: threeVersions,
        installedVersion: '1.1.0',
        strapiVersion: '5.50.0',
      })
    ).toMatchObject({ state: 'no-compatible-version', requiredStrapiRange: '^5.56.0' });
  });

  it.each([[{ status: 'not-licensed' } as const], [{ status: 'not-found' } as const]])(
    'passes %j on as a status',
    (lookup) => {
      expect(resolvePluginStatus({ lookup })).toEqual({ state: lookup.status });
    }
  );

  it.each([
    [{ status: 'license-rejected', message: 'The license was rejected.' } as const],
    [{ status: 'unavailable', message: 'The registry answered HTTP 500.' } as const],
  ])('stops with the message of %j', (lookup) => {
    expect(() => resolvePluginStatus({ lookup })).toThrow(lookup.message);
  });
});
