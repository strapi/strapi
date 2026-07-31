import { act, renderHook, waitFor } from '@tests/utils';

import { useUpload } from '../useUpload';

import type { UploadProgressCallback } from '../../future/services/uploadFileViaXHR';

const uploadFileViaXHRMock = jest.fn();

jest.mock('../../future/services/uploadFileViaXHR', () => ({
  ...jest.requireActual('../../future/services/uploadFileViaXHR'),
  uploadFileViaXHR: (...args: unknown[]) => uploadFileViaXHRMock(...args),
}));

type UploadArgs = Parameters<ReturnType<typeof useUpload>['upload']>;

const FIXTURE_ASSET = {
  name: 'asset.pdf',
  rawFile: new File(['file content'], 'asset.pdf', { type: 'application/pdf' }),
} as unknown as UploadArgs[0];

describe('useUpload', () => {
  test('reports byte-level upload progress as a 0-100 percentage', async () => {
    let capturedOnProgress: UploadProgressCallback | undefined;
    let resolveUpload!: (value: unknown) => void;

    uploadFileViaXHRMock.mockImplementation(
      (_url, _token, _formData, _signal, onProgress: UploadProgressCallback) => {
        capturedOnProgress = onProgress;
        return new Promise((resolve) => {
          resolveUpload = resolve;
        });
      }
    );

    const { result } = renderHook(() => useUpload());

    let uploadPromise: Promise<unknown>;
    act(() => {
      uploadPromise = result.current.upload(FIXTURE_ASSET, null);
    });

    await waitFor(() => expect(uploadFileViaXHRMock).toHaveBeenCalledTimes(1));

    // Halfway: 100 MiB of 200 MiB sent
    act(() => {
      capturedOnProgress?.(104857600, 209715200);
    });
    expect(result.current.progress).toBe(50);

    act(() => {
      capturedOnProgress?.(209715200, 209715200);
      resolveUpload([{ id: 1 }]);
    });
    await act(async () => {
      await uploadPromise;
    });

    expect(result.current.progress).toBe(100);

    const [url] = uploadFileViaXHRMock.mock.calls[0];
    expect(url).toBe(`${window.strapi.backendURL}/upload`);
  });
});
