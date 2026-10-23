import { fetchPackument, fetchPluginCatalog, searchPackageNames } from '../registry';
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
        fetchImplementation,
      })
    ).resolves.toEqual({
      status: 'available',
      packageNames: [packageName, '@strapi-enterprise/ai-workflows'],
    });
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://packages.strapi.io/-/v1/search?text=%40strapi-enterprise&size=250',
      expect.objectContaining({ headers: { Authorization: 'Bearer the-license' } })
    );
  });

  it.each([
    ['answers with an error', jest.fn().mockResolvedValue(createFetchResponse(500))],
    ['cannot be reached', jest.fn().mockRejectedValue(new TypeError('fetch failed'))],
  ])('reports the search as unavailable when it %s', async (_case, fetchImplementation) => {
    await expect(
      searchPackageNames({
        text: '@strapi-enterprise',
        license: 'the-license',
        fetchImplementation,
      })
    ).resolves.toEqual({ status: 'unavailable' });
  });

  it('tells a rejected license apart from an unavailable search', async () => {
    await expect(
      searchPackageNames({
        text: '@strapi-enterprise',
        license: 'the-license',
        fetchImplementation: jest.fn().mockResolvedValue(createFetchResponse(401)),
      })
    ).resolves.toEqual({
      status: 'license-rejected',
      message: expect.stringContaining('https://packages.strapi.io rejected this Strapi license.'),
    });
  });
});

describe('fetchPackument', () => {
  it('asks the Strapi registry for the full metadata, with the license as token', async () => {
    const packument = createPackument(packageName, [{ version: '1.0.0' }]);
    const fetchImplementation = jest.fn().mockResolvedValue(createFetchResponse(200, packument));

    const lookup = await fetchPackument({
      packageName,
      license: 'the-license',
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
    [403, 'not-licensed'],
    [404, 'not-found'],
  ])('maps HTTP %s to %s', async (status, expectedStatus) => {
    const fetchImplementation = jest.fn().mockResolvedValue(createFetchResponse(status));

    await expect(
      fetchPackument({ packageName, license: 'the-license', fetchImplementation })
    ).resolves.toEqual({ status: expectedStatus });
  });

  it('explains a rejected license, with where to check it', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(createFetchResponse(401));

    await expect(
      fetchPackument({ packageName, license: 'the-license', fetchImplementation })
    ).resolves.toEqual({
      status: 'license-rejected',
      message: expect.stringContaining('https://packages.strapi.io rejected this Strapi license.'),
    });
  });

  it('explains when the registry cannot be reached', async () => {
    const fetchImplementation = jest.fn().mockRejectedValue(new TypeError('fetch failed'));

    await expect(
      fetchPackument({ packageName, license: 'the-license', fetchImplementation })
    ).resolves.toEqual({
      status: 'unavailable',
      message: expect.stringContaining('Could not reach https://packages.strapi.io.'),
    });
  });

  it('reports other registry errors with their status', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(createFetchResponse(500));

    await expect(
      fetchPackument({ packageName, license: 'the-license', fetchImplementation })
    ).resolves.toEqual({
      status: 'unavailable',
      message: expect.stringContaining('https://packages.strapi.io answered HTTP 500'),
    });
  });
});

describe('fetchPackument with invalid data', () => {
  it('explains in one line when the answer is not valid JSON', async () => {
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
        fetchImplementation: jest.fn().mockResolvedValue(invalidResponse),
      })
    ).resolves.toEqual({
      status: 'unavailable',
      message:
        'https://packages.strapi.io answered with invalid data for @strapi-enterprise/plugin-ai-byok. Try again later.',
    });
  });
});

describe('fetchPluginCatalog', () => {
  const fetchCatalog = (fetchImplementation: typeof fetch) =>
    fetchPluginCatalog({ license: 'the-license', fetchImplementation });

  it('lists the plugins with whether the license includes them, and the message', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(
      createFetchResponse(200, {
        plugins: [
          {
            name: packageName,
            displayName: 'AI BYOK',
            description: 'Bring your own key.',
            kind: 'plugin',
            licensed: false,
          },
        ],
        notLicensedMessage: 'Contact Sales to enable them: https://strapi.io/contact-sales',
      })
    );

    await expect(fetchCatalog(fetchImplementation)).resolves.toEqual({
      status: 'available',
      plugins: [
        {
          name: packageName,
          displayName: 'AI BYOK',
          description: 'Bring your own key.',
          kind: 'plugin',
          licensed: false,
        },
      ],
      notLicensedMessage: 'Contact Sales to enable them: https://strapi.io/contact-sales',
    });
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://packages.strapi.io/-/strapi/plugins',
      expect.objectContaining({
        headers: { Authorization: 'Bearer the-license', Accept: 'application/json' },
      })
    );
  });

  it('leaves out a plugin with no name or no licensed flag', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(
      createFetchResponse(200, {
        plugins: [
          { name: packageName, licensed: true },
          { name: '@strapi-enterprise/plugin-other' },
          { licensed: true },
          'not-an-object',
        ],
      })
    );

    await expect(fetchCatalog(fetchImplementation)).resolves.toEqual({
      status: 'available',
      plugins: [{ name: packageName, licensed: true }],
    });
  });

  it('removes control characters and ANSI codes from the strings it prints', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(
      createFetchResponse(200, {
        plugins: [
          { name: packageName, displayName: '\u001B[1mAI\u001B[22m BYOK\u0007', licensed: false },
        ],
        notLicensedMessage: '\u001B[31mContact\u001B[0m Sales.\r\n\u001B]0;title\u0007Now.\u009B',
      })
    );

    await expect(fetchCatalog(fetchImplementation)).resolves.toMatchObject({
      plugins: [{ displayName: 'AI BYOK' }],
      notLicensedMessage: 'Contact Sales. Now.',
    });
  });

  it('removes format characters, such as a right-to-left override, without adding a space', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(
      createFetchResponse(200, {
        plugins: [],
        notLicensedMessage: 'Contact\u200B \u202Eselas\u202C https://strapi.io/con\u200Btact',
      })
    );

    await expect(fetchCatalog(fetchImplementation)).resolves.toMatchObject({
      notLicensedMessage: 'Contact selas https://strapi.io/contact',
    });
  });

  it('gives up on the catalog after 5 seconds, since the search can replace it', async () => {
    const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');
    const fetchImplementation = jest.fn().mockResolvedValue(createFetchResponse(404));

    await fetchCatalog(fetchImplementation);

    expect(timeoutSpy).toHaveBeenCalledWith(5000);
    timeoutSpy.mockRestore();
  });

  it('drops a message with nothing printable', async () => {
    const fetchImplementation = jest
      .fn()
      .mockResolvedValue(
        createFetchResponse(200, { plugins: [], notLicensedMessage: ' \u001B[0m ' })
      );

    await expect(fetchCatalog(fetchImplementation)).resolves.toEqual({
      status: 'available',
      plugins: [],
      notLicensedMessage: undefined,
    });
  });

  it('tells a rejected license apart from an unavailable catalog', async () => {
    await expect(
      fetchCatalog(jest.fn().mockResolvedValue(createFetchResponse(401)))
    ).resolves.toEqual({
      status: 'license-rejected',
      message: expect.stringContaining('https://packages.strapi.io rejected this Strapi license.'),
    });
  });

  it.each([
    ['is missing, as on an older registry', jest.fn().mockResolvedValue(createFetchResponse(404))],
    ['answers with an error', jest.fn().mockResolvedValue(createFetchResponse(500))],
    ['cannot be reached', jest.fn().mockRejectedValue(new TypeError('fetch failed'))],
    ['answers with no plugin list', jest.fn().mockResolvedValue(createFetchResponse(200, {}))],
    ['answers with no object', jest.fn().mockResolvedValue(createFetchResponse(200, null))],
    [
      'answers with a plugin list that is not an array',
      jest.fn().mockResolvedValue(createFetchResponse(200, { plugins: 'not-a-list' })),
    ],
    [
      'answers with invalid JSON',
      jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        async json() {
          throw new SyntaxError('Unexpected token < in JSON');
        },
      }),
    ],
    [
      'times out',
      jest
        .fn()
        .mockRejectedValue(
          new DOMException('The operation was aborted due to timeout', 'TimeoutError')
        ),
    ],
  ])('reports the catalog as unavailable when it %s', async (_case, fetchImplementation) => {
    await expect(fetchCatalog(fetchImplementation)).resolves.toEqual({ status: 'unavailable' });
  });
});
