import { fetchPackument, getRegistryUrl, searchPackageNames } from '../registry';
import { createFetchResponse, createPackument } from './test-helpers';

const packageName = '@strapi-enterprise/plugin-ai-byok';

describe('searchPackageNames', () => {
  it('lists the package names the registry search returns, with the license as token', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(
      createFetchResponse(200, {
        objects: [
          { package: { name: packageName } },
          { package: { name: '@strapi-enterprise/ai-workflows' } },
          { package: {} },
        ],
      })
    );

    await expect(
      searchPackageNames({
        text: '@strapi-enterprise',
        license: 'the-license',
        env: {},
        fetchImplementation,
      })
    ).resolves.toEqual([packageName, '@strapi-enterprise/ai-workflows']);
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://packages.strapi.io/-/v1/search?text=%40strapi-enterprise&size=250',
      expect.objectContaining({ headers: { Authorization: 'Bearer the-license' } })
    );
  });

  it.each([
    ['answers with an error', jest.fn().mockResolvedValue(createFetchResponse(500))],
    ['cannot be reached', jest.fn().mockRejectedValue(new TypeError('fetch failed'))],
  ])('returns undefined when the search %s', async (_case, fetchImplementation) => {
    await expect(
      searchPackageNames({
        text: '@strapi-enterprise',
        license: 'the-license',
        env: {},
        fetchImplementation,
      })
    ).resolves.toBeUndefined();
  });
});

describe('fetchPackument', () => {
  it('asks the Strapi registry for the full metadata, with the license as token', async () => {
    const packument = createPackument(packageName, [{ version: '1.0.0' }]);
    const fetchImplementation = jest.fn().mockResolvedValue(createFetchResponse(200, packument));

    const lookup = await fetchPackument({
      packageName,
      license: 'the-license',
      env: {},
      fetchImplementation,
    });

    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://packages.strapi.io/@strapi-enterprise/plugin-ai-byok',
      expect.objectContaining({
        headers: { Authorization: 'Bearer the-license', Accept: 'application/json' },
      })
    );
    expect(lookup).toEqual({ status: 'available', packument });
  });

  it.each([
    [401, 'license-rejected'],
    [403, 'not-licensed'],
    [404, 'not-found'],
  ])('maps HTTP %s to %s', async (status, expectedStatus) => {
    const fetchImplementation = jest.fn().mockResolvedValue(createFetchResponse(status));

    await expect(
      fetchPackument({ packageName, license: 'the-license', env: {}, fetchImplementation })
    ).resolves.toEqual({ status: expectedStatus });
  });

  it('uses STRAPI_ENTERPRISE_REGISTRY_URL when it is set', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(createFetchResponse(404));

    await fetchPackument({
      packageName,
      license: 'the-license',
      env: { STRAPI_ENTERPRISE_REGISTRY_URL: 'http://localhost:4873/' },
      fetchImplementation,
    });

    expect(fetchImplementation).toHaveBeenCalledWith(
      'http://localhost:4873/@strapi-enterprise/plugin-ai-byok',
      expect.anything()
    );
  });

  it('explains when the registry cannot be reached', async () => {
    const fetchImplementation = jest.fn().mockRejectedValue(new TypeError('fetch failed'));

    await expect(
      fetchPackument({ packageName, license: 'the-license', env: {}, fetchImplementation })
    ).rejects.toThrow('Could not reach https://packages.strapi.io.');
  });

  it('reports other registry errors with their status', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(createFetchResponse(500));

    await expect(
      fetchPackument({ packageName, license: 'the-license', env: {}, fetchImplementation })
    ).rejects.toThrow('https://packages.strapi.io answered HTTP 500');
  });
});

describe('getRegistryUrl', () => {
  it('uses the Strapi registry when STRAPI_ENTERPRISE_REGISTRY_URL is unset or empty', () => {
    expect(getRegistryUrl({})).toBe('https://packages.strapi.io');
    expect(getRegistryUrl({ STRAPI_ENTERPRISE_REGISTRY_URL: '  ' })).toBe(
      'https://packages.strapi.io'
    );
  });

  it('stops with a one-line error for a value that is not a URL', () => {
    expect(() => getRegistryUrl({ STRAPI_ENTERPRISE_REGISTRY_URL: 'not a url' })).toThrow(
      'STRAPI_ENTERPRISE_REGISTRY_URL is not a valid URL: not a url'
    );
  });
});

describe('fetchPackument with invalid data', () => {
  it('stops with a one-line error when the answer is not valid JSON', async () => {
    const invalidResponse = {
      status: 200,
      ok: true,
      async json() {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    } as unknown as Response;

    await expect(
      fetchPackument({
        packageName: '@strapi-enterprise/plugin-ai-byok',
        license: 'the-license',
        env: {},
        fetchImplementation: jest.fn().mockResolvedValue(invalidResponse),
      })
    ).rejects.toThrow(
      'https://packages.strapi.io answered with invalid data for @strapi-enterprise/plugin-ai-byok. Try again later.'
    );
  });
});
