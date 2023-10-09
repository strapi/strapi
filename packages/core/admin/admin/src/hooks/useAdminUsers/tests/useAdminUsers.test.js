import { renderHook, waitFor } from '@tests/utils';

import { useAdminUsers } from '../useAdminUsers';

const setup = (...args) => renderHook(() => useAdminUsers(...args));

describe('useAdminUsers', () => {
  test('fetches users', async () => {
    const { result } = setup();

    expect(result.current.isLoading).toBe(true);

    expect(result.current.users).toStrictEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
        }),
      ])
    );

    expect(result.current.pagination).toStrictEqual(
      expect.objectContaining({
        page: 1,
      })
    );
  });

  test('fetches a single user', async () => {
    const { result } = setup({ id: 1 });

    expect(result.current.isLoading).toBe(true);

    expect(result.current.users).toStrictEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toStrictEqual([
      expect.objectContaining({
        id: 1,
      }),
    ]);
  });

  test('forwards all query params except `id`', async () => {
    const { result } = setup({ id: 1, some: 'param' });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toStrictEqual([
      expect.objectContaining({
        params: {
          some: 'param',
        },
      }),
    ]);
  });

  test('extends the default react-query options', async () => {
    const { result } = setup(
      { id: null },
      {
        enabled: false,
      }
    );

    expect(result.current.isLoading).toBe(false);
  });
});
