import { renderHook, waitFor } from '@tests/utils';

import { useAdminRoles } from '../useAdminRoles';

describe('useAdminRoles', () => {
  test('fetches roles', async () => {
    const { result } = renderHook(() => useAdminRoles());

    expect(result.current.isLoading).toBe(true);

    expect(result.current.roles).toStrictEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.roles).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
        }),
      ])
    );
  });

  test('fetches a single role', async () => {
    const { result } = renderHook(() => useAdminRoles({ id: '1' }));

    expect(result.current.isLoading).toBe(true);

    expect(result.current.roles).toStrictEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.roles).toStrictEqual([
      expect.objectContaining({
        id: 1,
      }),
    ]);
  });

  test('forwards all query params except `id`', async () => {
    // @ts-expect-error - test purposes
    const { result } = renderHook(() => useAdminRoles({ id: '1', filters: 'param' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.roles).toStrictEqual([
      expect.objectContaining({
        code: 'strapi-editor',
        id: 1,
        params: {
          filters: 'param',
        },
      }),
    ]);
  });

  test('extends the default options', async () => {
    const { result } = renderHook(() =>
      useAdminRoles(
        {},
        {
          skip: true,
        }
      )
    );

    expect(result.current.isLoading).toBe(false);
  });
});
