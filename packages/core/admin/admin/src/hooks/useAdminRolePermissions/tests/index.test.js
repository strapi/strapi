import { renderHook, waitFor } from '@tests/utils';

import { useAdminRolePermissions } from '../index';

const setup = (...args) => renderHook(() => useAdminRolePermissions(...args));

describe('useAdminRolePermissions', () => {
  test('fetches permissions', async () => {
    const { result } = setup({ id: 1 });

    expect(result.current.isLoading).toBe(true);

    expect(result.current.permissions).toStrictEqual(undefined);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.permissions).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
        }),
      ])
    );
  });

  test('forwards all query params except `id`', async () => {
    const { result } = setup({ id: 1, some: 'param' });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.permissions).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          params: {
            some: 'param',
          },
        }),
      ])
    );
  });

  test('extends the default react-query options', async () => {
    const { result } = setup(
      { id: 1 },
      {
        enabled: false,
      }
    );

    expect(result.current.isLoading).toBe(false);
  });
});
