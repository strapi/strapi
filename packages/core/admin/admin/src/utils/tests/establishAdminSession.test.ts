import { getRunningAdminIdentityQueries } from '../../services/auth';
import { refreshAdminIdentity } from '../establishAdminSession';

import type { Dispatch } from '../../core/store/configure';

jest.mock('../../reducer', () => ({
  login: (payload: { token: string; persist?: boolean }) => ({
    type: 'admin/login',
    payload,
  }),
}));

jest.mock('../../services/api', () => ({
  adminApi: {
    util: {
      invalidateTags: (tags: readonly string[]) => ({
        type: 'adminApi/invalidateTags',
        payload: tags,
      }),
    },
  },
}));

jest.mock('../../services/auth', () => ({
  getRunningAdminIdentityQueries: jest.fn(() => []),
}));

/**
 * The real helper returns RTK Query thunks. These tests only need thenables,
 * which is what `Promise.allSettled` waits on.
 */
const getRunning = getRunningAdminIdentityQueries as unknown as jest.Mock<Array<Promise<void>>>;

const INVALIDATE_ME = {
  type: 'adminApi/invalidateTags',
  payload: ['Me'],
};

const flush = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

const deferred = () => {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });

  return { promise, resolve };
};

const rejectedQuery = (): Promise<void> => {
  const promise = Promise.reject(new Error('identity query failed'));
  promise.catch(() => {});
  return promise;
};

describe('refreshAdminIdentity', () => {
  const dispatch = jest.fn();
  const typedDispatch = dispatch as unknown as Dispatch;

  beforeEach(() => {
    dispatch.mockClear();
    getRunning.mockReset();
    getRunning.mockReturnValue([]);
  });

  it('invalidates once when nothing is in flight', () => {
    refreshAdminIdentity(typedDispatch);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(INVALIDATE_ME);
  });

  it('waits for a later wave and invalidates once', async () => {
    const first = deferred();
    const second = deferred();
    getRunning
      .mockReturnValueOnce([first.promise])
      .mockReturnValueOnce([first.promise, second.promise])
      .mockReturnValue([]);

    refreshAdminIdentity(typedDispatch);

    expect(dispatch).not.toHaveBeenCalled();

    first.resolve();
    await flush();
    expect(dispatch).not.toHaveBeenCalled();

    second.resolve();
    await flush();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(INVALIDATE_ME);
  });

  it('does not wait again on a query it has already seen', async () => {
    const query = Promise.resolve();
    getRunning.mockReturnValue([query]);

    refreshAdminIdentity(typedDispatch);
    await flush();

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(INVALIDATE_ME);
  });

  it('still invalidates once when an identity query rejects', async () => {
    getRunning.mockReturnValueOnce([rejectedQuery()]).mockReturnValue([]);

    refreshAdminIdentity(typedDispatch);
    await flush();

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(INVALIDATE_ME);
  });

  it('drops a superseded refresh and invalidates once for the current generation', async () => {
    const pending = deferred();
    getRunning.mockReturnValue([pending.promise]);

    refreshAdminIdentity(typedDispatch);
    refreshAdminIdentity(typedDispatch);

    expect(dispatch).not.toHaveBeenCalled();

    getRunning.mockReturnValue([]);
    pending.resolve();
    await flush();

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(INVALIDATE_ME);
  });

  it('does not invalidate when listing running queries throws', async () => {
    getRunning.mockImplementation(() => {
      throw new Error('store is not ready');
    });

    refreshAdminIdentity(typedDispatch);
    await flush();

    expect(dispatch).not.toHaveBeenCalled();
  });
});
