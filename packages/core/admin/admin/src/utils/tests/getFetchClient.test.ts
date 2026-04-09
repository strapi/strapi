import { getFetchClient, setOnTokenUpdate } from '../getFetchClient';

describe('getFetchClient', () => {
  const originalLocalStorage = window.localStorage;

  beforeEach(() => {
    window.fetch = jest.fn(); // Reset the mock before each test

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    jest.clearAllMocks();
  });

  it('should return the 4 HTTP methods to call GET, POST, PUT and DELETE apis', () => {
    const response = getFetchClient();
    expect(response).toHaveProperty('get');
    expect(response).toHaveProperty('post');
    expect(response).toHaveProperty('put');
    expect(response).toHaveProperty('del');
  });

  it('should call correct url', async () => {
    (window.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ data: 'success response' }),
      })
    );
    const fetchClient = getFetchClient();
    const { data } = await fetchClient.get('test-fetch-client');
    expect(data).toEqual({ data: 'success response' });
    expect(window.fetch).toHaveBeenCalledWith(
      'http://localhost:1337/test-fetch-client',
      expect.anything()
    );
  });

  it('should serialize a params object to a string', async () => {
    (window.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ data: 'success response' }),
      })
    );
    const mockParams = {
      page: '1',
      pageSize: '10',
      sort: 'short_text:ASC',
      filters: {
        $and: [
          {
            biginteger: {
              $eq: '3',
            },
          },
          {
            short_text: {
              $eq: 'test',
            },
          },
        ],
      },
      locale: 'en',
    };
    const fetchClient = getFetchClient();
    const { data } = await fetchClient.get('test-fetch-client', {
      params: mockParams,
    });
    expect(data).toEqual({ data: 'success response' });
    expect(window.fetch).toHaveBeenCalledWith(
      'http://localhost:1337/test-fetch-client?page=1&pageSize=10&sort=short_text:ASC&filters[$and][0][biginteger][$eq]=3&filters[$and][1][short_text][$eq]=test&locale=en',
      expect.anything()
    );
  });

  describe('responseType', () => {
    it('should return a Blob when responseType is blob', async () => {
      const blobContent = new Blob(['file content'], { type: 'application/zip' });

      (window.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          blob: () => Promise.resolve(blobContent),
        })
      );

      const fetchClient = getFetchClient();
      const { data } = await fetchClient.get('/api/export', { responseType: 'blob' });

      expect(data).toBe(blobContent);
    });

    it('should return a string when responseType is text', async () => {
      (window.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          text: () => Promise.resolve('hello world'),
        })
      );

      const fetchClient = getFetchClient();
      const { data } = await fetchClient.get('/api/export', { responseType: 'text' });

      expect(data).toBe('hello world');
    });

    it('should return an ArrayBuffer when responseType is arrayBuffer', async () => {
      const buffer = new ArrayBuffer(8);

      (window.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          arrayBuffer: () => Promise.resolve(buffer),
        })
      );

      const fetchClient = getFetchClient();
      const { data } = await fetchClient.get('/api/export', { responseType: 'arrayBuffer' });

      expect(data).toBe(buffer);
    });

    it('should throw a FetchError on non-2xx response for blob requests', async () => {
      (window.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          status: 404,
          ok: false,
        })
      );

      const fetchClient = getFetchClient();

      await expect(fetchClient.get('/api/export', { responseType: 'blob' })).rejects.toMatchObject({
        name: 'FetchError',
        status: 404,
      });
    });

    it('should not send Accept and Content-Type headers for blob requests', async () => {
      (window.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          blob: () => Promise.resolve(new Blob()),
        })
      );

      const fetchClient = getFetchClient();
      await fetchClient.get('/api/export', { responseType: 'blob' });

      const requestHeaders: Headers = (window.fetch as jest.Mock).mock.calls[0][1].headers;
      expect(requestHeaders.has('Accept')).toBe(false);
      expect(requestHeaders.has('Content-Type')).toBe(false);
      expect(requestHeaders.has('Authorization')).toBe(true);
    });

    it('should still send Accept and Content-Type headers for json requests', async () => {
      (window.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ data: 'ok' }),
        })
      );

      const fetchClient = getFetchClient();
      await fetchClient.get('/api/data');

      const requestHeaders: Headers = (window.fetch as jest.Mock).mock.calls[0][1].headers;
      expect(requestHeaders.has('Accept')).toBe(true);
      expect(requestHeaders.has('Content-Type')).toBe(true);
    });

    it('should include the response status and headers in the result', async () => {
      const responseHeaders = new Headers({
        'Content-Disposition': 'attachment; filename="export.zip"',
        'Content-Type': 'application/zip',
      });

      (window.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          headers: responseHeaders,
          blob: () => Promise.resolve(new Blob()),
        })
      );

      const fetchClient = getFetchClient();
      const result = await fetchClient.get('/api/export', { responseType: 'blob' });

      expect(result.status).toBe(200);
      expect(result.headers).toBe(responseHeaders);
      expect(result.headers?.get('Content-Disposition')).toBe('attachment; filename="export.zip"');
    });
  });

  describe('token refresh on 401', () => {
    it('should refresh token and retry on 401 error', async () => {
      // First call returns 401
      (window.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 401,
            ok: false,
            json: () =>
              Promise.resolve({
                error: { message: 'Unauthorized', status: 401 },
              }),
          })
        )
        // Token refresh call succeeds
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 200,
            ok: true,
            json: () =>
              Promise.resolve({
                data: { token: 'new-token' },
              }),
          })
        )
        // Retry call succeeds
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 200,
            ok: true,
            json: () => Promise.resolve({ data: 'success after retry' }),
          })
        );

      const fetchClient = getFetchClient();
      const { data } = await fetchClient.get('/api/test');

      expect(data).toEqual({ data: 'success after retry' });
      expect(window.fetch).toHaveBeenCalledTimes(3);

      // Verify token refresh was called
      expect(window.fetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:1337/admin/access-token',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should not refresh token for auth paths', async () => {
      // Call to login endpoint returns 401
      (window.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          status: 401,
          ok: false,
          json: () =>
            Promise.resolve({
              error: { message: 'Invalid credentials', status: 401 },
            }),
        })
      );

      const fetchClient = getFetchClient();

      await expect(
        fetchClient.post('/admin/login', { email: 'test', password: 'test' })
      ).rejects.toThrow('Invalid credentials');

      // Should only call once - no refresh attempt
      expect(window.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw original error if token refresh fails', async () => {
      // First call returns 401
      (window.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 401,
            ok: false,
            json: () =>
              Promise.resolve({
                error: { message: 'Token expired', status: 401 },
              }),
          })
        )
        // Token refresh call fails
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 401,
            ok: false,
            json: () =>
              Promise.resolve({
                error: { message: 'Refresh token invalid', status: 401 },
              }),
          })
        );

      const fetchClient = getFetchClient();

      await expect(fetchClient.get('/api/test')).rejects.toThrow('Token expired');

      // Should have called original request and refresh attempt
      expect(window.fetch).toHaveBeenCalledTimes(2);
    });

    it('should store new token in localStorage when refresh succeeds', async () => {
      // Mock localStorage.getItem to return existing token (indicating persist mode)
      (window.localStorage.getItem as jest.Mock).mockReturnValue('"old-token"');

      // First call returns 401
      (window.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 401,
            ok: false,
            json: () =>
              Promise.resolve({
                error: { message: 'Unauthorized', status: 401 },
              }),
          })
        )
        // Token refresh call succeeds
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 200,
            ok: true,
            json: () =>
              Promise.resolve({
                data: { token: 'new-token' },
              }),
          })
        )
        // Retry call succeeds
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 200,
            ok: true,
            json: () => Promise.resolve({ data: 'success' }),
          })
        );

      const fetchClient = getFetchClient();
      await fetchClient.get('/api/test');

      // Verify new token was stored in localStorage
      expect(window.localStorage.setItem).toHaveBeenCalledWith('jwtToken', '"new-token"');
    });

    it('should call onTokenUpdate callback when token is refreshed', async () => {
      const onTokenUpdateMock = jest.fn();
      setOnTokenUpdate(onTokenUpdateMock);

      // Mock localStorage.getItem to return existing token (indicating persist mode)
      (window.localStorage.getItem as jest.Mock).mockReturnValue('"old-token"');

      // First call returns 401
      (window.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 401,
            ok: false,
            json: () =>
              Promise.resolve({
                error: { message: 'Unauthorized', status: 401 },
              }),
          })
        )
        // Token refresh call succeeds
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 200,
            ok: true,
            json: () =>
              Promise.resolve({
                data: { token: 'new-token' },
              }),
          })
        )
        // Retry call succeeds
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 200,
            ok: true,
            json: () => Promise.resolve({ data: 'success' }),
          })
        );

      const fetchClient = getFetchClient();
      await fetchClient.get('/api/test');

      // Verify onTokenUpdate callback was called with the new token
      expect(onTokenUpdateMock).toHaveBeenCalledWith('new-token');

      // Clean up
      setOnTokenUpdate(null);
    });

    it('should refresh token and retry on 401 for blob requests', async () => {
      const blobContent = new Blob(['file content'], { type: 'application/zip' });

      (window.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 401,
            ok: false,
            json: () => Promise.resolve({ error: { message: 'Unauthorized', status: 401 } }),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 200,
            ok: true,
            json: () => Promise.resolve({ data: { token: 'new-token' } }),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 200,
            ok: true,
            blob: () => Promise.resolve(blobContent),
          })
        );

      const fetchClient = getFetchClient();
      const { data } = await fetchClient.get('/api/export', { responseType: 'blob' });

      expect(data).toBe(blobContent);
      expect(window.fetch).toHaveBeenCalledTimes(3);
    });

    it('should refresh token for POST requests with FormData', async () => {
      // First call returns 401
      (window.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 401,
            ok: false,
            json: () =>
              Promise.resolve({
                error: { message: 'Unauthorized', status: 401 },
              }),
          })
        )
        // Token refresh call succeeds
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 200,
            ok: true,
            json: () =>
              Promise.resolve({
                data: { token: 'new-token' },
              }),
          })
        )
        // Retry call succeeds
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 200,
            ok: true,
            json: () => Promise.resolve({ data: 'upload success' }),
          })
        );

      const fetchClient = getFetchClient();
      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.txt');

      const { data } = await fetchClient.post('/upload', formData);

      expect(data).toEqual({ data: 'upload success' });
      expect(window.fetch).toHaveBeenCalledTimes(3);
    });
  });
});
