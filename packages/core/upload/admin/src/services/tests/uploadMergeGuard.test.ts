import { adminApi } from '@strapi/admin/strapi-admin';
import { renderHook, act, waitFor } from '@tests/utils';

import { useTypedDispatch, useTypedSelector } from '../../store/hooks';
import { openUploadProgress, uploadProgressReducer } from '../../store/uploadProgress';
import { useUploadFilesMutation } from '../api';
import { uploadFileViaXHR } from '../uploadFileViaXHR';

jest.mock('../uploadFileViaXHR', () => ({
  ...jest.requireActual('../uploadFileViaXHR'),
  uploadFileViaXHR: jest.fn(),
}));

const mockUploadFileViaXHR = uploadFileViaXHR as jest.MockedFunction<typeof uploadFileViaXHR>;

/**
 * Its own file: `api.ts` holds the upload registry in module state, and every test
 * gets a fresh store, so `uploadId` restarts at 1 and would collide with a batch
 * registered by an earlier test — hiding the guard under test.
 */
const storeConfig = {
  reducer: {
    [adminApi.reducerPath]: adminApi.reducer,
    admin_app: (state = { token: 'test-token' }) => state,
    uploadProgress: uploadProgressReducer,
  },
};

const buildFormData = (count: number) => {
  const formData = new FormData();
  const fileInfo: Array<{ name: string; caption: null; alternativeText: null; folder: null }> = [];

  for (let i = 0; i < count; i += 1) {
    const name = `file-${i}.png`;
    formData.append('files', new File([`content-${i}`], name, { type: 'image/png' }));
    fileInfo.push({ name, caption: null, alternativeText: null, folder: null });
  }
  formData.append('fileInfo', JSON.stringify(fileInfo));

  return formData;
};

describe('merging only into a batch this endpoint owns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadFileViaXHR.mockImplementation(() => new Promise(() => {}));
  });

  it('starts a fresh batch rather than merging into a URL upload', async () => {
    const { result } = renderHook(
      () => ({
        upload: useUploadFilesMutation()[0],
        dispatch: useTypedDispatch(),
        progress: useTypedSelector((state) => state.uploadProgress),
      }),
      { providerOptions: { storeConfig } }
    );

    // Stand in for an in-flight URL upload: rows on screen, nothing registered.
    act(() => {
      result.current.dispatch(openUploadProgress({ totalFiles: 2, fileNames: ['a.jpg', 'b.jpg'] }));
    });

    const urlUploadId = result.current.progress.uploadId;
    expect(result.current.progress.files).toHaveLength(2);

    act(() => {
      result.current.upload({
        formData: buildFormData(1),
        totalFiles: 1,
        generateAiMetadata: false,
      });
    });

    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(1));

    await waitFor(() => expect(result.current.progress.uploadId).not.toBe(urlUploadId));
    expect(result.current.progress.files).toHaveLength(1);
    expect(result.current.progress.totalFiles).toBe(1);
  });
});
