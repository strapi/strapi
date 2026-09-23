import { logout } from '../../reducer';
import { fetchBaseQuery, isBaseQueryError } from '../baseQuery';
import { FetchError, getFetchClient, triggerSessionExpired } from '../getFetchClient';

import type { BaseQueryApi } from '@reduxjs/toolkit/query';

// Keep FetchError / isFetchError / ApiError real, only stub the fetch client
// factory and the session-expired notifier so we can drive them from tests.
// jest.mock calls are hoisted by babel-jest above imports, so the mocks apply
// before the imported bindings are evaluated.
jest.mock('../getFetchClient', () => ({
  ...jest.requireActual('../getFetchClient'),
  getFetchClient: jest.fn(),
  triggerSessionExpired: jest.fn(),
}));

// Stub the logout action creator so we can assert it is dispatched verbatim.
jest.mock('../../reducer', () => ({
  logout: jest.fn((payload?: unknown) => ({ type: 'LOGOUT', payload })),
}));

const buildApi = (overrides: Partial<BaseQueryApi> = {}) =>
  ({
    signal: new AbortController().signal,
    dispatch: jest.fn(),
    abort: jest.fn(),
    getState: jest.fn(),
    extra: undefined,
    endpoint: 'test',
    type: 'query',
    ...overrides,
  }) as unknown as BaseQueryApi;

const setFetchClient = (
  methods: Partial<Record<'get' | 'post' | 'del' | 'put', jest.Mock>> = {}
) => {
  (getFetchClient as jest.Mock).mockReturnValue({
    get: jest.fn(),
    post: jest.fn(),
    del: jest.fn(),
    put: jest.fn(),
    ...methods,
  });
};

describe('baseQuery', () => {
  const baseQuery = fetchBaseQuery();

  beforeEach(() => {
    jest.clearAllMocks();
    setFetchClient();
  });

  describe('success', () => {
    it('returns the response data for a string query', async () => {
      setFetchClient({ get: jest.fn().mockResolvedValue({ data: { ok: true } }) });

      const result = await baseQuery('/admin/foo', buildApi(), {});

      expect(result).toEqual({ data: { ok: true } });
    });

    it('returns the response data for a POST query', async () => {
      const post = jest.fn().mockResolvedValue({ data: { id: 1 } });
      setFetchClient({ post });

      const result = await baseQuery(
        { url: '/admin/foo', method: 'POST', data: { name: 'foo' } },
        buildApi(),
        {}
      );

      expect(post).toHaveBeenCalledWith('/admin/foo', { name: 'foo' }, expect.objectContaining({}));
      expect(result).toEqual({ data: { id: 1 } });
    });
  });

  describe('non-fetch errors (regression: preserve name and stack, stay serializable)', () => {
    it('preserves the real error name and stack without stashing a raw Error instance', async () => {
      const typeError = new TypeError('boom');
      setFetchClient({ get: jest.fn().mockRejectedValue(typeError) });

      const result = await baseQuery('/admin/foo', buildApi(), {});

      expect(result.data).toBeUndefined();
      // name is the real constructor name, not a hardcoded 'UnknownError'
      expect(result.error).toMatchObject({ name: 'TypeError', message: 'boom' });
      // stack is forwarded to the UI/devtools layer
      expect(typeof (result.error as { stack?: string }).stack).toBe('string');
      // the raw Error instance must NOT be stored (Redux serializability)
      expect((result.error as { details?: unknown }).details).toBeUndefined();
    });

    it('produces a plain serializable shape (no Error prototype on the error payload)', async () => {
      setFetchClient({ get: jest.fn().mockRejectedValue(new RangeError('out of range')) });

      const result = await baseQuery('/admin/foo', buildApi(), {});

      expect(result.error).not.toBeInstanceOf(Error);
      expect(result.error).toEqual({
        name: 'RangeError',
        message: 'out of range',
        stack: expect.any(String),
      });
    });

    it('wraps a non-Error thrown value as a generic Error', async () => {
      // Non-Error values (e.g. a thrown string) get normalized to `new Error('Unknown error')`.
      setFetchClient({ get: jest.fn().mockRejectedValue('something weird') });

      const result = await baseQuery('/admin/foo', buildApi(), {});

      expect(result.error).toMatchObject({ name: 'Error', message: 'Unknown error' });
    });
  });

  describe('fetch errors', () => {
    it('returns the API error from the response payload when present', async () => {
      const fetchError = new FetchError('bad', {
        data: { error: { name: 'ValidationError', message: 'bad', details: { errors: [] } } },
      });
      setFetchClient({ get: jest.fn().mockRejectedValue(fetchError) });

      const result = await baseQuery('/admin/foo', buildApi(), {});

      expect(result).toEqual({
        data: undefined,
        error: { name: 'ValidationError', message: 'bad', details: { errors: [] } },
      });
    });

    it('returns an UnknownApiError shape when no error payload is present', async () => {
      const fetchError = new FetchError('server error');
      fetchError.status = 500;
      setFetchClient({ get: jest.fn().mockRejectedValue(fetchError) });

      const result = await baseQuery('/admin/foo', buildApi(), {});

      expect(result.error).toEqual({
        name: 'UnknownError',
        message: 'server error',
        details: undefined,
        status: 500,
      });
    });
  });

  describe('401 handling', () => {
    it('triggers session expiry on a non-auth path without clearing auth state directly', async () => {
      const post = jest.fn().mockResolvedValue({});
      (getFetchClient as jest.Mock).mockReturnValue({
        get: jest.fn().mockRejectedValue(buildUnauthorizedError()),
        post,
        del: jest.fn(),
        put: jest.fn(),
      });

      const dispatch = jest.fn();
      await baseQuery('/admin/foo', buildApi({ dispatch }), {});

      // AuthProvider owns logout / unsaved-change confirmation.
      expect(post).not.toHaveBeenCalledWith('/admin/logout');
      expect(logout).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalledWith({ type: 'LOGOUT', payload: undefined });
      expect(triggerSessionExpired).toHaveBeenCalledTimes(1);
    });

    it('does not log out on auth paths', async () => {
      const post = jest.fn().mockResolvedValue({});
      (getFetchClient as jest.Mock).mockReturnValue({
        get: jest.fn().mockRejectedValue(buildUnauthorizedError()),
        post,
        del: jest.fn(),
        put: jest.fn(),
      });

      const dispatch = jest.fn();
      await baseQuery('/admin/login', buildApi({ dispatch }), {});

      expect(post).not.toHaveBeenCalledWith('/admin/logout');
      expect(logout).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
      expect(triggerSessionExpired).not.toHaveBeenCalled();
    });

    it('still triggers session expiry when AuthProvider will handle logout', async () => {
      const post = jest.fn().mockRejectedValue(new Error('network'));
      (getFetchClient as jest.Mock).mockReturnValue({
        get: jest.fn().mockRejectedValue(buildUnauthorizedError()),
        post,
        del: jest.fn(),
        put: jest.fn(),
      });

      const dispatch = jest.fn();
      await baseQuery('/admin/foo', buildApi({ dispatch }), {});

      expect(logout).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalledWith({ type: 'LOGOUT', payload: undefined });
      expect(triggerSessionExpired).toHaveBeenCalledTimes(1);
    });
  });

  describe('isBaseQueryError', () => {
    it('narrows ApiError-shaped payloads to BaseQueryError', () => {
      const error = { name: 'ValidationError', message: 'bad', details: {} };

      expect(isBaseQueryError(error)).toBe(true);
    });

    it('narrows UnknownApiError-shaped payloads to BaseQueryError', () => {
      const error = { name: 'UnknownError', message: 'bad' };

      expect(isBaseQueryError(error)).toBe(true);
    });

    it('returns false for a SerializedError without a name', () => {
      const error = { message: 'bad', stack: '...' };

      expect(isBaseQueryError(error)).toBe(false);
    });
  });
});

function buildUnauthorizedError(): FetchError {
  const fetchError = new FetchError('Unauthorized', {
    data: { error: { name: 'UnauthorizedError', message: 'Unauthorized', details: {} } },
  });
  fetchError.status = 401;

  return fetchError;
}
