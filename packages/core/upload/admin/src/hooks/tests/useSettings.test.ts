import { useFetchClient } from '@strapi/admin/strapi-admin';
import { renderHook, waitFor } from '@tests/utils';

import { useSettings } from '../useSettings';

// The shared test setup auto-mocks this hook for consumers, we want the real one here.
jest.unmock('../useSettings');

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useFetchClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({
      data: {
        data: {
          sizeOptimization: true,
          responsiveDimensions: true,
          autoOrientation: false,
        },
      },
    }),
  }),
}));

function setup(...args: Parameters<typeof useSettings>) {
  return renderHook(() => useSettings(...args));
}

describe('useSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches the settings and reports loading until they resolve', async () => {
    const { get } = useFetchClient();
    const { result } = setup();

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(get).toHaveBeenCalledWith('/upload/settings');
    expect(result.current.data).toEqual({
      sizeOptimization: true,
      responsiveDimensions: true,
      autoOrientation: false,
    });
  });

  test('does not report loading when disabled with an empty cache', async () => {
    const { get } = useFetchClient();
    const { result } = setup(false);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => expect(get).not.toHaveBeenCalled());

    expect(result.current.isLoading).toBe(false);
  });
});
