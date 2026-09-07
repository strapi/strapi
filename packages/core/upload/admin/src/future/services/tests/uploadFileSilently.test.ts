import { adminApi } from '@strapi/admin/strapi-admin';
import { renderHook, act, waitFor } from '@tests/utils';

import { useUploadFileSilentlyMutation } from '../api';
import { uploadFileViaXHR, UploadFileError } from '../uploadFileViaXHR';

jest.mock('../uploadFileViaXHR', () => ({
  ...jest.requireActual('../uploadFileViaXHR'),
  uploadFileViaXHR: jest.fn(),
}));

const mockUploadFileViaXHR = uploadFileViaXHR as jest.MockedFunction<typeof uploadFileViaXHR>;

const storeConfig = {
  reducer: {
    [adminApi.reducerPath]: adminApi.reducer,
    admin_app: (state = { token: 'test-token' }) => state,
  },
};

const upload = async () => {
  const { result } = renderHook(() => useUploadFileSilentlyMutation(), {
    providerOptions: { storeConfig },
  });

  await act(async () => {
    await result.current[0]({
      file: new File(['content'], 'photo.png', { type: 'image/png' }),
      fileInfo: { name: 'photo.png', caption: '', alternativeText: '', folder: null },
    });
  });

  await waitFor(() => expect(result.current[1].isLoading).toBe(false));

  return result.current[1];
};

describe('uploadFileSilently', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards a message the server actually sent', async () => {
    mockUploadFileViaXHR.mockRejectedValue(new UploadFileError('FileTooBig', 413, true));

    const { error } = await upload();

    expect(error).toMatchObject({ name: 'UnknownError', message: 'FileTooBig' });
  });

  it("drops the XHR layer's hardcoded English so the caller's localized copy wins", async () => {
    mockUploadFileViaXHR.mockRejectedValue(
      new UploadFileError('Upload failed with status 500', 500)
    );

    const { error } = await upload();

    expect(error).toMatchObject({ name: 'UnknownError', message: '' });
  });
});
