import { act, renderHook, waitFor } from '@tests/utils';

import { hashAdminUserEmail } from '../../utils/users';
import { useHashedAdminUserId } from '../useHashedAdminUserId';

jest.mock('../../utils/users', () => ({
  hashAdminUserEmail: jest.fn(),
}));

const deferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });

  return { promise, resolve };
};

type AdminUser = Parameters<typeof hashAdminUserEmail>[0];

const user = (email: string) => ({ email }) as AdminUser;

describe('useHashedAdminUserId', () => {
  it('clears the previous id and ignores a stale hash completion after the admin changes', async () => {
    const hashes = new Map<string, ReturnType<typeof deferred<string | null>>>();

    jest.mocked(hashAdminUserEmail).mockImplementation((admin) => {
      const email = admin?.email ?? '';
      const hash = deferred<string | null>();
      hashes.set(email, hash);

      return hash.promise;
    });

    const { result, rerender } = renderHook(
      ({ admin }: { admin: AdminUser }) => useHashedAdminUserId(admin),
      { initialProps: { admin: user('a@example.com') } }
    );

    await act(async () => {
      hashes.get('a@example.com')?.resolve('hash-a');
    });
    await waitFor(() => expect(result.current).toBe('hash-a'));

    rerender({ admin: user('b@example.com') });
    expect(result.current).toBeUndefined();

    rerender({ admin: user('c@example.com') });
    await act(async () => {
      hashes.get('b@example.com')?.resolve('hash-b');
    });
    expect(result.current).toBeUndefined();

    await act(async () => {
      hashes.get('c@example.com')?.resolve('hash-c');
    });
    await waitFor(() => expect(result.current).toBe('hash-c'));
  });

  it('keeps the id when the same admin is refetched as a new object', async () => {
    jest.mocked(hashAdminUserEmail).mockImplementation(() => new Promise(() => {}));

    const { result, rerender } = renderHook(
      ({ admin }: { admin: AdminUser }) => useHashedAdminUserId(admin),
      { initialProps: { admin: user('a@example.com') } }
    );

    jest.mocked(hashAdminUserEmail).mockResolvedValueOnce('hash-a');
    rerender({ admin: user('a@example.com') });
    await waitFor(() => expect(result.current).toBe('hash-a'));

    jest.mocked(hashAdminUserEmail).mockImplementation(() => new Promise(() => {}));
    rerender({ admin: user('a@example.com') });
    expect(result.current).toBe('hash-a');
  });
});
