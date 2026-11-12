import { FetchError, useFetchClient } from '@strapi/admin/strapi-admin';
import { act, renderHook, waitFor } from '@tests/utils';

import { useEditAsset } from '../useEditAsset';

import type { File as FileAsset } from '../../../../../shared/contracts/files';

const notificationStatusMock = jest.fn();

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useNotification() {
    return { toggleNotification: notificationStatusMock };
  },
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

  test('does not notify when the request is cancelled', async () => {
    const { post } = useFetchClient();

    jest.mocked(post).mockImplementation(
      (_url, _data, config?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          config?.signal?.addEventListener('abort', () =>
            reject(new DOMException('signal is aborted without reason', 'AbortError'))
          );
        })
    );

    const { result } = renderHook(() => useEditAsset());

    let request: Promise<unknown> | undefined;

    act(() => {
      request = result.current.editAsset(FIXTURE_ASSET, FIXTURE_FILE);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    act(() => {
      result.current.cancel();
    });

    await expect(request).rejects.toThrow(DOMException);
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(notificationStatusMock).not.toHaveBeenCalled();
  });

  test('shows the permission message on a 403', async () => {
    const { post } = useFetchClient();
    const error = new FetchError('Forbidden');
    error.status = 403;

    jest.mocked(post).mockRejectedValue(error);

    const { result } = renderHook(() => useEditAsset());

    await act(async () => {
      await expect(result.current.editAsset(FIXTURE_ASSET, FIXTURE_FILE)).rejects.toBe(error);
    });

    await waitFor(() =>
      expect(notificationStatusMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'info', message: 'upload.permissions.not-allowed.update' })
      )
    );
  });

  test('shows the server message on other errors', async () => {
    const { post } = useFetchClient();

    jest.mocked(post).mockRejectedValue(new FetchError('Something went wrong'));

    const { result } = renderHook(() => useEditAsset());

    await act(async () => {
      await expect(result.current.editAsset(FIXTURE_ASSET, FIXTURE_FILE)).rejects.toThrow();
    });

    await waitFor(() =>
      expect(notificationStatusMock).toHaveBeenCalledWith({
        type: 'danger',
        message: 'Something went wrong',
      })
    );
  });
});
