import { useFetchClient } from '@strapi/admin/strapi-admin';
import { act, renderHook, waitFor } from '@tests/utils';

import { useEditAsset } from '../useEditAsset';

import type { File as FileAsset } from '../../../../../shared/contracts/files';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useFetchClient: jest.fn().mockReturnValue({
    post: jest.fn(),
  }),
}));

const FIXTURE_ASSET = {
  id: 1,
  name: 'asset.png',
  alternativeText: null,
  caption: null,
  folder: null,
} as unknown as FileAsset;

const FIXTURE_FILE = new File(['file content'], 'asset.png', { type: 'image/png' });

describe('useEditAsset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('cancel aborts the in-flight request after the hook re-renders', async () => {
    const { post } = useFetchClient();
    let capturedSignal: AbortSignal | undefined;

    jest.mocked(post).mockImplementation((_url, _data, config?: { signal?: AbortSignal }) => {
      capturedSignal = config?.signal;
      return new Promise(() => {});
    });

    const { result } = renderHook(() => useEditAsset());

    act(() => {
      result.current.editAsset(FIXTURE_ASSET, FIXTURE_FILE);
    });

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    // The mutation entering its loading state re-renders the hook.
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    act(() => {
      result.current.cancel();
    });

    expect(capturedSignal?.aborted).toBe(true);
  });
});
