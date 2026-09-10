import {
  ADMIN_REFRESH_LOCK,
  attemptTokenRefresh,
  getFetchClient,
  refreshAccessToken,
  setOnSessionExpired,
  setOnTokenUpdate,
  triggerSessionExpired,
} from '../getFetchClient';

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

      await expect(fetchClient.get('/api/test')).rejects.toThrow('Token expired');

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

      triggerSessionExpired();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should be a no-op when no callback is registered', () => {
      // Explicit clear in case any prior test left one set.
      setOnSessionExpired(null);

      expect(() => triggerSessionExpired()).not.toThrow();
    });

    it('should clear the callback when set to null', () => {
      const callback = jest.fn();
      setOnSessionExpired(callback);
      setOnSessionExpired(null);

      triggerSessionExpired();

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
