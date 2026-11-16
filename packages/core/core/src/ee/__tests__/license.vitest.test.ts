import { describe, it, expect, vi, type Mock } from 'vitest';
import {
  fetchLicense,
  reportAdminUsers,
  LicenseCheckError,
  LICENSE_REGISTRY_URI,
} from '../license';

const VALIDATE_URL = `${LICENSE_REGISTRY_URI}/api/licenses/validate`;

type ResponseOptions = {
  status: number;
  contentType?: string | null;
  body?: unknown;
};

type FetchArgs = [url: string, init: unknown];
type FetchMock = Mock<Promise<Response>, FetchArgs>;

const createResponse = ({
  status,
  contentType = 'application/json',
  body,
}: ResponseOptions): Response => {
  // No Content-Type header at all: return a bodyless response so undici does not infer one.
  if (contentType === null) {
    return new Response(null, { status });
  }

  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(payload, { status, headers: { 'Content-Type': contentType } });
};

const mockFetch = (response: Response): FetchMock =>
  vi.fn<Promise<Response>, FetchArgs>().mockResolvedValue(response);

const createStrapi = (
  fetchImpl: FetchMock,
  {
    installId = 'install-id-from-package-json',
    strapiVersion = '5.0.0',
  }: { installId?: string; strapiVersion?: string } = {}
) =>
  ({
    config: {
      installId,
      get: vi.fn((key: string) => (key === 'info.strapi' ? strapiVersion : undefined)),
    },
    fetch: fetchImpl,
    log: { debug: vi.fn(), warn: vi.fn() },
  }) as any;

const sentBody = (fetchImpl: FetchMock) => JSON.parse(fetchImpl.mock.calls[0][1].body as string);

describe('fetchLicense', () => {
  it('POSTs the license key, project id and device id as JSON to the license registry', async () => {
    const fetchImpl = mockFetch(
      createResponse({ status: 200, body: { data: { license: 'the-license' } } })
    );
    const strapi = createStrapi(fetchImpl, { installId: 'the-device-id' });

    await fetchLicense({ strapi }, 'the-key', 'the-project-id');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.any(String),
    });
    expect(sentBody(fetchImpl)).toMatchObject({
      key: 'the-key',
      projectId: 'the-project-id',
      // installId is returned verbatim by generateInstallId when set
      deviceId: 'the-device-id',
    });
  });

  it('sends the instance id and the Strapi version, but no user hashes', async () => {
    const fetchImpl = mockFetch(
      createResponse({ status: 200, body: { data: { license: 'the-license' } } })
    );
    const strapi = createStrapi(fetchImpl, { strapiVersion: '5.62.0' });

    await fetchLicense({ strapi }, 'the-key', 'the-project-id');

    const body = sentBody(fetchImpl);
    expect(body.instanceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(body.strapiVersion).toBe('5.62.0');
    expect(body).not.toHaveProperty('userHashes');
  });

  it('keeps the same instance id across checks of the same process', async () => {
    const fetchImpl = vi
      .fn<Promise<Response>, FetchArgs>()
      .mockImplementation(async () =>
        createResponse({ status: 200, body: { data: { license: 'the-license' } } })
      );
    const strapi = createStrapi(fetchImpl);

    await fetchLicense({ strapi }, 'key', 'project');
    await fetchLicense({ strapi }, 'key', 'project');

    const [first, second] = fetchImpl.mock.calls.map(([, init]) =>
      JSON.parse((init as RequestInit).body as string)
    );
    expect(first.instanceId).toBe(second.instanceId);
  });

  it('returns the license string on a 200 response', async () => {
    const fetchImpl = mockFetch(
      createResponse({ status: 200, body: { data: { license: 'the-license' } } })
    );

    const license = await fetchLicense({ strapi: createStrapi(fetchImpl) }, 'key', 'project');

    expect(license).toBe('the-license');
  });

  it('throws a LicenseCheckError with the registry error message on a 400 response', async () => {
    const fetchImpl = mockFetch(
      createResponse({ status: 400, body: { error: { message: 'Invalid key.' } } })
    );

    const promise = fetchLicense({ strapi: createStrapi(fetchImpl) }, 'key', 'project');

    await expect(promise).rejects.toBeInstanceOf(LicenseCheckError);
    await expect(promise).rejects.toMatchObject({
      message: 'Invalid key.',
      shouldFallback: false,
    });
  });

  it('throws a LicenseCheckError on a 404 response', async () => {
    const fetchImpl = mockFetch(createResponse({ status: 404, body: {} }));

    const promise = fetchLicense({ strapi: createStrapi(fetchImpl) }, 'key', 'project');

    await expect(promise).rejects.toBeInstanceOf(LicenseCheckError);
    await expect(promise).rejects.toMatchObject({
      message: 'The license used does not exists.',
      shouldFallback: false,
    });
  });

  it('throws a fallback error when a JSON response body does not parse', async () => {
    // A truncated or garbled body from the registry is an outage, not a rejection: it must
    // keep the stored license rather than switch the instance to CE.
    const fetchImpl = mockFetch(createResponse({ status: 200, body: '{"data": {"lic' }));

    const promise = fetchLicense({ strapi: createStrapi(fetchImpl) }, 'key', 'project');

    await expect(promise).rejects.toBeInstanceOf(LicenseCheckError);
    await expect(promise).rejects.toMatchObject({ shouldFallback: true });
  });

  it('throws a fallback error on an unexpected status code', async () => {
    const fetchImpl = mockFetch(createResponse({ status: 500, body: {} }));

    const promise = fetchLicense({ strapi: createStrapi(fetchImpl) }, 'key', 'project');

    await expect(promise).rejects.toMatchObject({
      message: 'Could not proceed to the online validation of your license.',
      shouldFallback: true,
    });
  });

  it('throws a fallback error when the response is not JSON', async () => {
    const fetchImpl = mockFetch(
      createResponse({ status: 200, contentType: 'text/html', body: '<html></html>' })
    );

    const promise = fetchLicense({ strapi: createStrapi(fetchImpl) }, 'key', 'project');

    await expect(promise).rejects.toMatchObject({
      message: 'Could not proceed to the online validation of your license.',
      shouldFallback: true,
    });
  });

  it('throws a fallback error when the Content-Type header is missing', async () => {
    const fetchImpl = mockFetch(createResponse({ status: 200, contentType: null }));

    const promise = fetchLicense({ strapi: createStrapi(fetchImpl) }, 'key', 'project');

    await expect(promise).rejects.toMatchObject({ shouldFallback: true });
  });

  it('throws a fallback error when the fetch call rejects', async () => {
    const fetchImpl = vi
      .fn<Promise<Response>, FetchArgs>()
      .mockRejectedValue(new Error('network down'));

    const promise = fetchLicense({ strapi: createStrapi(fetchImpl) }, 'key', 'project');

    await expect(promise).rejects.toMatchObject({
      message: 'Could not proceed to the online validation of your license.',
      shouldFallback: true,
    });
  });

  describe('response schema validation', () => {
    it('throws a fallback error when a 200 response is missing data.license', async () => {
      const fetchImpl = mockFetch(createResponse({ status: 200, body: { data: {} } }));

      const promise = fetchLicense({ strapi: createStrapi(fetchImpl) }, 'key', 'project');

      await expect(promise).rejects.toMatchObject({ shouldFallback: true });
    });

    it('throws a fallback error when a 200 response has a non-string license', async () => {
      const fetchImpl = mockFetch(createResponse({ status: 200, body: { data: { license: 42 } } }));

      const promise = fetchLicense({ strapi: createStrapi(fetchImpl) }, 'key', 'project');

      await expect(promise).rejects.toMatchObject({ shouldFallback: true });
    });

    it('throws a fallback error when a 400 response is missing error.message', async () => {
      const fetchImpl = mockFetch(createResponse({ status: 400, body: { error: {} } }));

      const promise = fetchLicense({ strapi: createStrapi(fetchImpl) }, 'key', 'project');

      await expect(promise).rejects.toMatchObject({ shouldFallback: true });
    });
  });
});

describe('reportAdminUsers', () => {
  const USAGE_URL = `${LICENSE_REGISTRY_URI}/api/licenses/admin-users`;
  const HASHES = ['a'.repeat(64)];
  const USAGE = { activeUsers: 12, contractedUsers: 10, updatedAt: '2026-11-13T10:00:00.000Z' };

  it('POSTs the license key, the instance id and the user hashes, with a timeout', async () => {
    const fetchImpl = mockFetch(createResponse({ status: 200, body: { data: USAGE } }));

    await reportAdminUsers({ strapi: createStrapi(fetchImpl) }, 'the-key', HASHES);

    expect(fetchImpl).toHaveBeenCalledWith(USAGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.any(String),
      signal: expect.any(AbortSignal),
    });
    expect(sentBody(fetchImpl)).toEqual({
      key: 'the-key',
      instanceId: expect.any(String),
      userHashes: HASHES,
    });
  });

  it('returns the count on a 200 response', async () => {
    const fetchImpl = mockFetch(
      createResponse({ status: 200, body: { data: { ...USAGE, extra: 'ignored' } } })
    );

    await expect(
      reportAdminUsers({ strapi: createStrapi(fetchImpl) }, 'key', HASHES)
    ).resolves.toEqual(USAGE);
  });

  it('accepts a license without a contracted number of users', async () => {
    const fetchImpl = mockFetch(
      createResponse({ status: 200, body: { data: { ...USAGE, contractedUsers: null } } })
    );

    await expect(
      reportAdminUsers({ strapi: createStrapi(fetchImpl) }, 'key', HASHES)
    ).resolves.toMatchObject({ contractedUsers: null });
  });

  // 404: unknown key or older registry; 429: rate limited
  it.each([404, 405, 429, 500])('resolves to null on a %s response', async (status) => {
    const fetchImpl = mockFetch(
      createResponse({ status, body: { error: { code: 'license_not_found' } } })
    );

    await expect(
      reportAdminUsers({ strapi: createStrapi(fetchImpl) }, 'key', HASHES)
    ).resolves.toBeNull();
  });

  it.each([
    ['a missing data object', {}],
    ['a non-numeric activeUsers', { data: { ...USAGE, activeUsers: '12' } }],
    ['a missing contractedUsers', { data: { activeUsers: 1, updatedAt: USAGE.updatedAt } }],
    ['an invalid updatedAt', { data: { ...USAGE, updatedAt: 'not a date' } }],
  ])('resolves to null on a 200 response with %s', async (_label, body) => {
    const fetchImpl = mockFetch(createResponse({ status: 200, body }));

    await expect(
      reportAdminUsers({ strapi: createStrapi(fetchImpl) }, 'key', HASHES)
    ).resolves.toBeNull();
  });

  it('resolves to null on a body that does not parse', async () => {
    const fetchImpl = mockFetch(createResponse({ status: 200, body: '{"data":' }));

    await expect(
      reportAdminUsers({ strapi: createStrapi(fetchImpl) }, 'key', HASHES)
    ).resolves.toBeNull();
  });

  it('resolves to null when the request fails', async () => {
    const fetchImpl = vi
      .fn<Promise<Response>, FetchArgs>()
      .mockRejectedValue(new Error('network down'));

    await expect(
      reportAdminUsers({ strapi: createStrapi(fetchImpl) }, 'key', HASHES)
    ).resolves.toBeNull();
  });
});
