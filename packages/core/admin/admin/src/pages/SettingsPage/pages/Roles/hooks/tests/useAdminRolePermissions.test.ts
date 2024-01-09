import { renderHook, waitFor } from '@tests/utils';
import { UseQueryOptions } from 'react-query';

import { useAdminRolePermissions, APIRolePermissionsQueryParams } from '../useAdminRolePermissions';

const setup = (params?: APIRolePermissionsQueryParams, options?: UseQueryOptions) =>
  renderHook(() => useAdminRolePermissions(params, options));

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
    // @ts-expect-error - test purposes
    const { result } = setup({ id: 1, filters: 'param' });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.permissions).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          params: {
            filters: 'param',
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
