import { fetchLicense, LicenseCheckError, LICENSE_REGISTRY_URI } from '../license';

const VALIDATE_URL = `${LICENSE_REGISTRY_URI}/api/licenses/validate`;

type ResponseOptions = {
  status: number;
  contentType?: string | null;
  body?: unknown;
};

type FetchArgs = [url: string, init: unknown];
type FetchMock = jest.Mock<Promise<Response>, FetchArgs>;

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
  jest.fn<Promise<Response>, FetchArgs>().mockResolvedValue(response);

const createStrapi = (
  fetchImpl: FetchMock,
  { installId = 'install-id-from-package-json' }: { installId?: string } = {}
) =>
  ({
    config: { installId },
    fetch: fetchImpl,
  }) as any;

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
      // installId is returned verbatim by generateInstallId when set
      body: JSON.stringify({
        key: 'the-key',
        projectId: 'the-project-id',
        deviceId: 'the-device-id',
      }),
    });
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
    const fetchImpl = jest
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
