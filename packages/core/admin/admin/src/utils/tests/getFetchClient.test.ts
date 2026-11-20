import {
  ADMIN_REFRESH_LOCK,
  attemptTokenRefresh,
  FetchError,
  getFailedRequestSessionToken,
  getFetchClient,
  refreshAccessToken,
  resetSessionExpiredNotification,
  setOnSessionExpired,
  setOnTokenUpdate,
  triggerSessionExpired,
  unstable_addRequestHeaders,
} from '../getFetchClient';

import { AUTH_COOKIE_NAME, deleteCookie } from '../cookies';

import type { FetchClient, FetchOptions, RequestHeadersProvider } from '../getFetchClient';

const buildJwt = (expSeconds: number): string => {
  const json = JSON.stringify({ exp: expSeconds });
  const base64url = window.btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${base64url}.signature`;
};

describe('getFetchClient', () => {
  const originalLocalStorage = window.localStorage;
  const originalNavigatorLocks = navigator.locks;

  beforeEach(() => {
    window.fetch = jest.fn(); // Reset the mock before each test

    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: jest.fn(async (_name: string, callback: () => Promise<unknown>) => callback()),
      },
    });

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
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: originalNavigatorLocks,
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

  it('should not append a trailing ? when params is an empty object', async () => {
    (window.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ data: 'success response' }),
      })
    );
    const fetchClient = getFetchClient();
    await fetchClient.get('test-fetch-client', { params: {} });
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

  describe('204 no-content response', () => {
    it('should return empty data for 204 responses without calling response.json()', async () => {
      const jsonMock = jest.fn();
      (window.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          status: 204,
          ok: true,
          json: jsonMock,
        })
      );

      const fetchClient = getFetchClient();
      const result = await fetchClient.post('/admin/forgot-password', {
        email: 'test@example.com',
      });

      expect(result).toEqual({ data: {}, status: 204 });
      expect(jsonMock).not.toHaveBeenCalled();
    });

    it('should handle 204 responses for all HTTP methods', async () => {
      const mock204 = () =>
        Promise.resolve({
          status: 204,
          ok: true,
          json: jest.fn(),
        });

      (window.fetch as jest.Mock)
        .mockImplementationOnce(mock204)
        .mockImplementationOnce(mock204)
        .mockImplementationOnce(mock204)
        .mockImplementationOnce(mock204);

      const fetchClient = getFetchClient();

      const getResult = await fetchClient.get('/test');
      expect(getResult).toEqual({ data: {}, status: 204 });

      const postResult = await fetchClient.post('/test', {});
      expect(postResult).toEqual({ data: {}, status: 204 });

      const putResult = await fetchClient.put('/test', {});
      expect(putResult).toEqual({ data: {}, status: 204 });

      const delResult = await fetchClient.del('/test');
      expect(delResult).toEqual({ data: {}, status: 204 });
    });
  });

  describe('credentials', () => {
    it('should send credentials for all HTTP methods', async () => {
      const mockOk = () =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ data: 'success response' }),
        });

      (window.fetch as jest.Mock)
        .mockImplementationOnce(mockOk)
        .mockImplementationOnce(mockOk)
        .mockImplementationOnce(mockOk)
        .mockImplementationOnce(mockOk);

      const fetchClient = getFetchClient();

      await fetchClient.get('/test');
      await fetchClient.post('/test', {});
      await fetchClient.put('/test', {});
      await fetchClient.del('/test');

      (window.fetch as jest.Mock).mock.calls.forEach(([, options]) => {
        expect(options).toEqual(expect.objectContaining({ credentials: 'include' }));
      });
    });
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

    it('attributes a failed retry to the refreshed token instead of the original token', async () => {
      (window.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 401,
            ok: false,
            json: () =>
              Promise.resolve({
                error: { message: 'Original token expired', status: 401 },
              }),
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
            status: 401,
            ok: false,
            json: () =>
              Promise.resolve({
                error: { message: 'Refreshed token rejected', status: 401 },
              }),
          })
        );

      const fetchClient = getFetchClient();

      try {
        await fetchClient.get('/api/test');
        throw new Error('Expected the retried request to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(FetchError);
        expect(error).toMatchObject({ message: 'Refreshed token rejected' });
        expect(getFailedRequestSessionToken(error as FetchError)).toBe('new-token');
        expect(Object.keys(error as object)).not.toContain('sessionToken');
        expect(JSON.stringify(error)).not.toContain('new-token');
      }
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
      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify('token-a'));

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
        // Token refresh fails once under the cross-tab lock
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

      try {
        await fetchClient.get('/api/test');
        throw new Error('Expected the request to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(FetchError);
        expect(error).toMatchObject({ message: 'Token expired' });
        expect(getFailedRequestSessionToken(error as FetchError)).toBe('token-a');
        expect(Object.keys(error as object)).not.toContain('sessionToken');
        expect(JSON.stringify(error)).not.toContain('token-a');
      }

      // Original request plus one access-token attempt
      expect(window.fetch).toHaveBeenCalledTimes(2);
    });

    it('should adopt a valid access token from shared storage before calling access-token', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const staleToken = buildJwt(nowSeconds - 60);
      const freshToken = buildJwt(nowSeconds + 3600);
      let storageReads = 0;

      (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key !== 'jwtToken') {
          return null;
        }

        storageReads += 1;
        return JSON.stringify(storageReads === 1 ? staleToken : freshToken);
      });

      const token = await attemptTokenRefresh();

      expect(token).toBe(freshToken);
      expect(window.fetch).not.toHaveBeenCalled();
    });

    it('should serialize refresh across tabs so only one access-token call is made', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const staleToken = buildJwt(nowSeconds - 60);
      const freshToken = buildJwt(nowSeconds + 3600);
      let lockChain = Promise.resolve();
      let holders = 0;

      Object.defineProperty(navigator, 'locks', {
        configurable: true,
        value: {
          request: jest.fn(async (_name: string, callback: () => Promise<unknown>) => {
            const run = lockChain.then(async () => {
              holders += 1;
              expect(holders).toBe(1);
              try {
                return await callback();
              } finally {
                holders -= 1;
              }
            });
            lockChain = run.then(() => undefined);
            return run;
          }),
        },
      });

      let storageReads = 0;
      (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key !== 'jwtToken') {
          return null;
        }

        storageReads += 1;
        // Two tabs capture stale tokens, then the lock holder checks storage once more.
        return JSON.stringify(storageReads <= 3 ? staleToken : freshToken);
      });

      (window.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          ok: true,
          json: () =>
            Promise.resolve({
              data: { token: freshToken },
            }),
        })
      );

      const [first, second] = await Promise.all([refreshAccessToken(), refreshAccessToken()]);

      expect(first).toBe(freshToken);
      expect(second).toBe(freshToken);
      expect(window.fetch).toHaveBeenCalledTimes(1);
      expect(navigator.locks.request).toHaveBeenCalledWith(
        ADMIN_REFRESH_LOCK,
        expect.any(Function)
      );
    });

    it('should adopt a token refreshed before the failed request starts refresh handling', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const staleToken = buildJwt(nowSeconds - 60);
      const freshToken = buildJwt(nowSeconds + 3600);
      let storageReads = 0;

      (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key !== 'jwtToken') {
          return null;
        }

        storageReads += 1;
        return JSON.stringify(storageReads === 1 ? staleToken : freshToken);
      });

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
            json: () => Promise.resolve({ data: 'success after retry' }),
          })
        );

      const fetchClient = getFetchClient();
      const { data } = await fetchClient.get('/api/test');

      expect(data).toEqual({ data: 'success after retry' });
      expect(navigator.locks.request).toHaveBeenCalledWith(
        ADMIN_REFRESH_LOCK,
        expect.any(Function)
      );
      expect(window.fetch).toHaveBeenCalledTimes(2);
      expect(window.fetch).not.toHaveBeenCalledWith(
        'http://localhost:1337/admin/access-token',
        expect.anything()
      );

      const retryHeaders = (window.fetch as jest.Mock).mock.calls[1][1].headers as Headers;
      expect(retryHeaders.get('Authorization')).toBe(`Bearer ${freshToken}`);
    });

    it('should adopt a token from shared cookie storage before calling access-token', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const staleToken = buildJwt(nowSeconds - 60);
      const freshToken = buildJwt(nowSeconds + 3600);

      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
      document.cookie = `jwtToken=${encodeURIComponent(freshToken)}; Path=/`;

      const token = await refreshAccessToken(staleToken);

      expect(token).toBe(freshToken);
      expect(window.fetch).not.toHaveBeenCalled();

      document.cookie = 'jwtToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    });

    it('should wait for a shared token before retrying when Web Locks are unavailable', async () => {
      Object.defineProperty(navigator, 'locks', {
        configurable: true,
        value: undefined,
      });

      const nowSeconds = Math.floor(Date.now() / 1000);
      const staleToken = buildJwt(nowSeconds - 60);
      const freshToken = buildJwt(nowSeconds + 3600);
      let storedToken = staleToken;

      (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key !== 'jwtToken') {
          return null;
        }

        return JSON.stringify(storedToken);
      });

      (window.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 401,
            ok: false,
            json: () => Promise.resolve({ error: { message: 'Unauthorized', status: 401 } }),
          })
        )
        .mockImplementationOnce(() => {
          setTimeout(() => {
            storedToken = freshToken;
          }, 0);

          return Promise.resolve({
            status: 401,
            ok: false,
          });
        })
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
      expect(window.fetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:1337/admin/access-token',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
      );

      const retryHeaders = (window.fetch as jest.Mock).mock.calls[2][1].headers as Headers;
      expect(retryHeaders.get('Authorization')).toBe(`Bearer ${freshToken}`);
    });

    it('should retry access-token once when Web Locks are unavailable', async () => {
      Object.defineProperty(navigator, 'locks', {
        configurable: true,
        value: undefined,
      });

      const nowSeconds = Math.floor(Date.now() / 1000);
      const staleToken = buildJwt(nowSeconds - 60);

      (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key !== 'jwtToken') {
          return null;
        }

        return JSON.stringify(staleToken);
      });

      (window.fetch as jest.Mock)
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 401,
            ok: false,
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 200,
            ok: true,
            json: () =>
              Promise.resolve({
                data: { token: 'recovered-token' },
              }),
          })
        );

      const token = await attemptTokenRefresh();

      expect(token).toBe('recovered-token');
      expect(window.fetch).toHaveBeenCalledTimes(2);
      expect(window.fetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:1337/admin/access-token',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
      );
      expect(window.fetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:1337/admin/access-token',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
      );
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

  describe('session-expired callback', () => {
    afterEach(() => {
      setOnSessionExpired(null);
    });

    it('should invoke the registered callback when triggerSessionExpired is called', () => {
      const callback = jest.fn();
      setOnSessionExpired(callback);

      expect(triggerSessionExpired()).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should invoke the callback only once for a single dead session', () => {
      const callback = jest.fn();
      setOnSessionExpired(callback);

      expect(triggerSessionExpired()).toBe(true);
      expect(triggerSessionExpired()).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should invoke the callback again after the session is re-armed', () => {
      const callback = jest.fn();
      setOnSessionExpired(callback);

      triggerSessionExpired();
      resetSessionExpiredNotification();
      triggerSessionExpired();

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('deduplicates one expired token without suppressing a newer session expiry', () => {
      const callback = jest.fn();
      setOnSessionExpired(callback);

      triggerSessionExpired('token-a');
      triggerSessionExpired();
      triggerSessionExpired('token-a');
      triggerSessionExpired('token-b');

      expect(callback).toHaveBeenNthCalledWith(1, 'token-a');
      expect(callback).toHaveBeenNthCalledWith(2, 'token-b');
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should report that nothing handled the expiry when no callback is registered', () => {
      // Explicit clear in case any prior test left one set.
      setOnSessionExpired(null);

      expect(triggerSessionExpired()).toBe(false);
    });

    it('should clear the callback when set to null', () => {
      const callback = jest.fn();
      setOnSessionExpired(callback);
      setOnSessionExpired(null);

      triggerSessionExpired();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('request headers', () => {
    type Send = (client: FetchClient, url: string, options?: FetchOptions) => Promise<unknown>;

    const methods: Array<[string, Send]> = [
      ['get', (client, url, options) => client.get(url, options)],
      ['post', (client, url, options) => client.post(url, {}, options)],
      ['put', (client, url, options) => client.put(url, {}, options)],
      ['del', (client, url, options) => client.del(url, options)],
    ];

    let removers: Array<() => void> = [];
    const register = (provider: RequestHeadersProvider) => {
      removers.push(unstable_addRequestHeaders(provider));
    };

    const sentHeaders = (call = 0): Headers =>
      (window.fetch as jest.Mock).mock.calls[call][1].headers;

    beforeEach(() => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify('stored-token'));
      (window.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({}) })
      );
    });

    afterEach(() => {
      removers.forEach((remove) => remove());
      removers = [];
    });

    it.each(methods)(
      '%s: a caller header replaces the default whatever its casing',
      async (_method, send) => {
        await send(getFetchClient(), '/x', { headers: { authorization: 'Bearer caller-token' } });

        expect(sentHeaders().get('Authorization')).toBe('Bearer caller-token');
      }
    );

    it.each(methods)('%s: sends the headers a plugin registered', async (_method, send) => {
      register(() => ({ 'x-strapi-space': 'france' }));

      await send(getFetchClient(), '/x');

      expect(sentHeaders().get('x-strapi-space')).toBe('france');
    });

    it.each(methods)(
      '%s: a 401 retry sends the headers read when the call started',
      async (_method, send) => {
        const nowSeconds = Math.floor(Date.now() / 1000);
        let storageReads = 0;
        (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
          if (key !== 'jwtToken') {
            return null;
          }
          storageReads += 1;
          return JSON.stringify(buildJwt(nowSeconds + (storageReads === 1 ? -60 : 3600)));
        });

        let space = 'france';
        register(() => ({ 'x-strapi-space': space }));

        (window.fetch as jest.Mock)
          .mockImplementationOnce(() => {
            // The tab switches space while the first attempt is in flight.
            space = 'spain';
            return Promise.resolve({
              status: 401,
              ok: false,
              json: () => Promise.resolve({ error: { message: 'Unauthorized', status: 401 } }),
            });
          })
          .mockImplementationOnce(() =>
            Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({}) })
          );

        await send(getFetchClient(), '/x');

        expect(window.fetch).toHaveBeenCalledTimes(2);
        expect(sentHeaders(1).get('x-strapi-space')).toBe('france');
      }
    );

    it.each(methods)(
      '%s: a caller header replaces a registered header with the same name',
      async (_method, send) => {
        register(() => ({ 'x-strapi-space': 'france' }));

        await send(getFetchClient(), '/x', { headers: { 'X-Strapi-Space': 'spain' } });

        expect(sentHeaders().get('x-strapi-space')).toBe('spain');
      }
    );

    it.each([
      [
        'post',
        (client: FetchClient, body: FormData, options: FetchOptions) =>
          client.post('/x', body, options),
      ],
      [
        'put',
        (client: FetchClient, body: FormData, options: FetchOptions) =>
          client.put('/x', body, options),
      ],
    ])('%s: sends a FormData body without a caller Content-Type', async (_method, send) => {
      await send(getFetchClient(), new FormData(), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      expect(sentHeaders().has('Content-Type')).toBe(false);
    });

    it('sends the headers on the retry of a request sent without a stored token', async () => {
      const freshToken = buildJwt(Math.floor(Date.now() / 1000) + 3600);
      let storageReads = 0;
      (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key !== 'jwtToken') {
          return null;
        }
        storageReads += 1;
        return storageReads === 1 ? null : JSON.stringify(freshToken);
      });
      deleteCookie(AUTH_COOKIE_NAME);
      register(() => ({ 'x-strapi-space': 'france' }));

      let attempts = 0;
      (window.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.endsWith('/admin/access-token')) {
          return Promise.resolve({
            status: 200,
            ok: true,
            json: () => Promise.resolve({ data: { token: freshToken } }),
          });
        }
        attempts += 1;
        return Promise.resolve(
          attempts === 1
            ? {
                status: 401,
                ok: false,
                json: () => Promise.resolve({ error: { message: 'Unauthorized', status: 401 } }),
              }
            : { status: 200, ok: true, json: () => Promise.resolve({}) }
        );
      });

      await getFetchClient().get('/x');

      const retry = (window.fetch as jest.Mock).mock.calls.at(-1);
      expect(retry[0]).toMatch(/\/x$/);
      expect(retry[1].headers.get('x-strapi-space')).toBe('france');
    });

    it('leaves out a registered header whose value is undefined', async () => {
      register(() => ({ 'x-strapi-space': undefined }));

      await getFetchClient().get('/x');

      expect(sentHeaders().has('x-strapi-space')).toBe(false);
    });

    it('stops sending a header once its provider is removed', async () => {
      const remove = unstable_addRequestHeaders(() => ({ 'x-strapi-space': 'france' }));
      remove();

      await getFetchClient().get('/x');

      expect(sentHeaders().has('x-strapi-space')).toBe(false);
    });

    it.each([
      ['Authorization', 'Bearer stored-token'],
      ['Content-Type', 'application/json'],
      ['Accept', 'application/json'],
    ])('keeps the value core sends when a registered header names %s', async (name, expected) => {
      register(() => ({ [name.toLowerCase()]: 'from-plugin' }));

      await getFetchClient().post('/x', {});

      expect(sentHeaders().get(name)).toBe(expected);
    });

    describe('when a provider fails', () => {
      it.each(methods)('%s: does not send the request when a provider throws', async (_m, send) => {
        const failure = new Error('provider failed');
        register(() => {
          throw failure;
        });
        register(() => ({ 'x-strapi-space': 'france' }));

        await expect(send(getFetchClient(), '/x')).rejects.toMatchObject({
          name: 'RequestHeadersError',
          cause: failure,
        });
        expect(window.fetch).not.toHaveBeenCalled();
      });

      it.each([
        ['a promise', async () => ({ 'x-strapi-space': 'france' })],
        ['an array', () => [['x-strapi-space', 'france']]],
        ['null', () => null],
        ['a string', () => 'france'],
      ])('does not send the request when a provider returns %s', async (_name, provider) => {
        // Plain JavaScript plugins can return anything, which the type does not allow
        register(provider as unknown as RequestHeadersProvider);

        await expect(getFetchClient().get('/x')).rejects.toMatchObject({
          name: 'RequestHeadersError',
        });
        expect(window.fetch).not.toHaveBeenCalled();
      });

      it.each([
        ['post', '/admin/login'],
        ['post', '/admin/logout'],
      ])('%s %s: still sends the request', async (_method, url) => {
        register(() => {
          throw new Error('provider failed');
        });

        await getFetchClient().post(url, {});

        expect(window.fetch).toHaveBeenCalledTimes(1);
      });

      it('still sends a pre-login request with a stored token', async () => {
        register(() => {
          throw new Error('provider failed');
        });

        await getFetchClient().get('/admin/init');

        expect(window.fetch).toHaveBeenCalledTimes(1);
      });

      it('does not send a request whose path only starts like an auth path', async () => {
        register(() => {
          throw new Error('provider failed');
        });

        await expect(getFetchClient().get('/admin/login-history')).rejects.toMatchObject({
          name: 'RequestHeadersError',
        });
        expect(window.fetch).not.toHaveBeenCalled();
      });

      it('does not send the request when a header cannot be sent by the browser', async () => {
        register(() => ({ 'x-strapi-space': '日本' }));

        await expect(getFetchClient().get('/x')).rejects.toMatchObject({
          name: 'RequestHeadersError',
          message: expect.stringContaining('"x-strapi-space"'),
        });
        expect(window.fetch).not.toHaveBeenCalled();
      });
    });
  });
});
