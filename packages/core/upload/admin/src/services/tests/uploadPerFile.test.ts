import { adminApi } from '@strapi/admin/strapi-admin';
import { renderHook, act, waitFor } from '@tests/utils';

import { useTypedDispatch, useTypedSelector } from '../../store/hooks';
import { cancelFile, uploadProgressReducer } from '../../store/uploadProgress';
import {
  abortUploadFile,
  getUploadSourceFile,
  useRetryUploadFileMutation,
  useUploadFilesMutation,
} from '../api';
import { uploadFileViaXHR, UploadAbortedError, UploadFileError } from '../uploadFileViaXHR';

jest.mock('../uploadFileViaXHR', () => ({
  ...jest.requireActual('../uploadFileViaXHR'),
  uploadFileViaXHR: jest.fn(),
}));

const mockUploadFileViaXHR = uploadFileViaXHR as jest.MockedFunction<typeof uploadFileViaXHR>;

interface PendingRequest {
  name: string;
  signal: AbortSignal;
  resolve: () => void;
  reject: (err: unknown) => void;
}

const buildFormData = (names: string[]) => {
  const formData = new FormData();

  names.forEach((name) => formData.append('files', new File(['x'], name, { type: 'image/png' })));
  formData.append(
    'fileInfo',
    JSON.stringify(
      names.map((name) => ({ name, caption: null, alternativeText: null, folder: null }))
    )
  );

  return formData;
};

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

const setup = (names: string[], { owner }: { owner?: string } = {}) => {
  const requests: PendingRequest[] = [];

  mockUploadFileViaXHR.mockImplementation(
    (_url, _token, formData, signal) =>
      new Promise((resolve, reject) => {
        const name = (formData.get('files') as File).name;
        signal.addEventListener('abort', () => reject(new UploadAbortedError()));
        requests.push({
          name,
          signal,
          resolve: () => resolve({ id: requests.length, name } as never),
          reject,
        });
      })
  );

  const { result } = renderHook(
    () => ({
      upload: useUploadFilesMutation()[0],
      retry: useRetryUploadFileMutation()[0],
      dispatch: useTypedDispatch(),
      progress: useTypedSelector((state) => state.uploadProgress),
    }),
    { providerOptions: { storeConfig } }
  );

  act(() => {
    result.current.upload({
      formData: buildFormData(names),
      totalFiles: names.length,
      concurrency: 2,
      generateAiMetadata: false,
      owner,
    });
  });

  const request = (name: string) => requests.find((pending) => pending.name === name)!;
  const statuses = () => result.current.progress.files.map((file) => file.status);

  return { requests, request, result, statuses };
};

const flush = () =>
  act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });

describe('per-file upload control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tags every row of the batch with its owner', async () => {
    const { result } = setup(['a.png', 'b.png'], { owner: 'field' });

    await waitFor(() => expect(result.current.progress.files).toHaveLength(2));
    expect(result.current.progress.files.map((file) => file.owner)).toEqual(['field', 'field']);
  });

  it('keeps the picked file for previews and retries', async () => {
    const { result } = setup(['a.png']);

    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(1));

    expect(getUploadSourceFile(result.current.progress.uploadId, 0)?.name).toBe('a.png');
  });

  it('aborts one file in flight and lets the batch carry on', async () => {
    const { request, result, statuses } = setup(['a.png', 'b.png', 'c.png']);

    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(2));

    await act(async () => {
      abortUploadFile(result.current.progress.uploadId, 0);
      result.current.dispatch(cancelFile({ uploadId: result.current.progress.uploadId, index: 0 }));
    });

    expect(request('a.png').signal.aborted).toBe(true);
    expect(request('b.png').signal.aborted).toBe(false);

    // The freed worker picks up the next file.
    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(3));

    await act(async () => {
      request('b.png').resolve();
      request('c.png').resolve();
    });

    await waitFor(() => expect(statuses()).toEqual(['cancelled', 'complete', 'complete']));
  });

  it('skips a cancelled file that was still queued', async () => {
    const { request, result, statuses } = setup(['a.png', 'b.png', 'c.png']);

    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(2));

    await act(async () => {
      abortUploadFile(result.current.progress.uploadId, 2);
      result.current.dispatch(cancelFile({ uploadId: result.current.progress.uploadId, index: 2 }));
    });

    await act(async () => {
      request('a.png').resolve();
      request('b.png').resolve();
    });
    await flush();

    expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(2);
    expect(statuses()).toEqual(['complete', 'complete', 'cancelled']);
  });

  it('retries one failed file and leaves the others alone', async () => {
    const { requests, request, result, statuses } = setup(['a.png', 'b.png']);

    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(2));

    await act(async () => {
      request('a.png').reject(new UploadFileError('Server error'));
      request('b.png').resolve();
    });
    await waitFor(() => expect(statuses()).toEqual(['error', 'complete']));

    requests.length = 0;

    let retried: Promise<unknown> | undefined;
    act(() => {
      retried = result.current
        .retry({ uploadId: result.current.progress.uploadId, index: 0 })
        .unwrap();
    });

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].name).toBe('a.png');
    expect(statuses()).toEqual(['uploading', 'complete']);

    await act(async () => {
      request('a.png').resolve();
    });

    await expect(retried).resolves.toEqual([expect.objectContaining({ name: 'a.png' })]);
    expect(statuses()).toEqual(['complete', 'complete']);
  });

  it('refuses to retry a row from a batch that is no longer current', async () => {
    const { result } = setup(['a.png']);

    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(1));

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.retry({
        uploadId: result.current.progress.uploadId + 1,
        index: 0,
      });
    });

    expect(outcome).toMatchObject({ error: { message: 'Original file not found' } });
    expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(1);
  });
});
