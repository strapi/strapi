import { renderHook, waitFor } from '@tests/utils';

import { useAdminRolePermissionLayout } from '..';

const setup = (...args) => renderHook(() => useAdminRolePermissionLayout(...args));

describe('useAdminRolePermissionLayout', () => {
  test('fetches permissions layout', async () => {
    const { result } = setup(1);

    expect(result.current.isLoading).toBe(true);

    expect(result.current.data).toStrictEqual(undefined);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toStrictEqual(
      expect.objectContaining({
        conditions: expect.any(Array),
      })
    );
  });

  test('extends the default react-query options', async () => {
    const { result } = setup(1, {
      enabled: false,
    });

    expect(result.current.isLoading).toBe(false);
  });
});
