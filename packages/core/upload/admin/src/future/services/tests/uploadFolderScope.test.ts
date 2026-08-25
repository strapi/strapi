import { adminApi } from '@strapi/admin/strapi-admin';
import { renderHook, act, waitFor } from '@tests/utils';

import { useTypedSelector } from '../../store/hooks';
import { selectCompletedUploads, uploadProgressReducer } from '../../store/uploadProgress';
import { useUploadFilesMutation } from '../api';
import { uploadFileViaXHR } from '../uploadFileViaXHR';

/**
 * The create response is built without populating the folder relation, so an
 * uploaded asset comes back with no folder at all. The list needs one to tell
 * whether a fresh upload belongs to the folder on screen, so the upload
 * re-attaches the folder it targeted.
 *
 * Its own file rather than joining the pool suite: the upload registry is module
 * state while each test gets a fresh store, so ids collide across tests.
 */

jest.mock('../uploadFileViaXHR', () => ({
  ...jest.requireActual('../uploadFileViaXHR'),
  uploadFileViaXHR: jest.fn(),
}));

const mockUploadFileViaXHR = uploadFileViaXHR as jest.MockedFunction<typeof uploadFileViaXHR>;

// The harness store has no `uploadProgress` slice (the plugin registers it via
// `app.addReducers` at runtime), and overriding `reducer` replaces the whole
// map — so the default slices must be re-declared alongside it.
const storeConfig = {
  reducer: {
    [adminApi.reducerPath]: adminApi.reducer,
    admin_app: (state = { token: 'test-token' }) => state,
    uploadProgress: uploadProgressReducer,
  },
};

const buildFormData = (folder: number | null) => {
  const formData = new FormData();
  formData.append('files', new File(['content'], 'file.png', { type: 'image/png' }));
  formData.append(
    'fileInfo',
    JSON.stringify([{ name: 'file.png', caption: null, alternativeText: null, folder }])
  );

  return formData;
};

const setup = (folder: number | null) => {
  const { result } = renderHook(
    () => ({
      upload: useUploadFilesMutation(),
      completed: useTypedSelector(selectCompletedUploads),
    }),
    { providerOptions: { storeConfig } }
  );

  act(() => {
    result.current.upload[0]({
      formData: buildFormData(folder),
      totalFiles: 1,
      generateAiMetadata: false,
    });
  });

  return result;
};

describe('uploaded assets carry the folder they targeted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // What the server actually answers: the created file, with no folder on it.
    mockUploadFileViaXHR.mockResolvedValue({ id: 1, name: 'file.png' } as never);
  });

  it('re-attaches the target folder the response left out', async () => {
    const result = setup(5);

    await waitFor(() => expect(result.current.completed).toHaveLength(1));
    expect(result.current.completed[0].folder).toBe(5);
  });

  it('leaves a root upload at the root', async () => {
    const result = setup(null);

    await waitFor(() => expect(result.current.completed).toHaveLength(1));
    expect(result.current.completed[0].folder).toBeNull();
  });

  it('keeps a folder the response did provide', async () => {
    mockUploadFileViaXHR.mockResolvedValue({ id: 1, name: 'file.png', folder: 9 } as never);

    const result = setup(5);

    await waitFor(() => expect(result.current.completed).toHaveLength(1));
    expect(result.current.completed[0].folder).toBe(9);
  });
});
