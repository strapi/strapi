import { adminApi } from '@strapi/admin/strapi-admin';
import { renderHook, act, waitFor } from '@tests/utils';

import { uploadProgressReducer } from '../../store/uploadProgress';
import { abortUpload, useUploadFilesMutation } from '../api';
import { uploadFileViaXHR, UploadAbortedError } from '../uploadFileViaXHR';

jest.mock('../uploadFileViaXHR', () => ({
  ...jest.requireActual('../uploadFileViaXHR'),
  uploadFileViaXHR: jest.fn(),
}));

const mockUploadFileViaXHR = uploadFileViaXHR as jest.MockedFunction<typeof uploadFileViaXHR>;

/** Deferred upload: resolves only when the test decides, so the test controls
 * exactly how many requests are in flight at any moment. */
interface Deferred {
  resolve: () => void;
  reject: (err: unknown) => void;
}

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

const setup = (count: number, concurrency?: number) => {
  const inFlight: Deferred[] = [];

  mockUploadFileViaXHR.mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        inFlight.push({
          resolve: () => resolve({ id: inFlight.length, name: 'uploaded' } as never),
          reject,
        });
      })
  );

  const { result } = renderHook(() => useUploadFilesMutation(), {
    providerOptions: { storeConfig },
  });

  act(() => {
    result.current[0]({
      formData: buildFormData(count),
      totalFiles: count,
      concurrency,
      generateAiMetadata: false,
    });
  });

  return { inFlight, result };
};

const settle = async (inFlight: Deferred[], upTo: number) => {
  for (let i = 0; i < upTo; i += 1) {
    if (inFlight[i]) {
      // Each resolution frees a worker, which may enqueue the next request.
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        inFlight[i].resolve();
      });
    }
  }
};

describe('uploadFiles worker pool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploads strictly sequentially by default', async () => {
    const { inFlight } = setup(3);

    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(1));

    await settle(inFlight, 1);
    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(2));

    await settle(inFlight, 2);
    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(3));
  });

  it('keeps at most `concurrency` requests in flight', async () => {
    const { inFlight } = setup(5, 2);

    // Two workers start immediately — and no more than two.
    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(2));

    // Freeing ONE slot pulls exactly ONE more file (rolling pool, not waves).
    await settle(inFlight, 1);
    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(3));

    await settle(inFlight, 3);
    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(5));
  });

  it('caps the pool at the number of files (no extra workers spun up)', async () => {
    const { inFlight } = setup(2, 10);

    // Both files start at once (concurrency 10 clamped to the 2 available)…
    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(2));

    // …and resolving them starts nothing more: the clamp means the pool never
    // had idle workers waiting to pull a third (non-existent) file. Without the
    // `Math.min(_, queue.length)` clamp this assertion still holds, but pairing
    // it with the count above distinguishes "capped" from "ran a third worker".
    await settle(inFlight, 2);
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
    expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(2);
  });

  it('treats an invalid concurrency (0) as sequential', async () => {
    const { inFlight } = setup(3, 0);

    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(1));
    await settle(inFlight, 1);
    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(2));
  });

  it('treats a NaN concurrency as sequential and still uploads every file', async () => {
    // Regression: NaN once propagated to `Array.from({ length: NaN })` = zero
    // workers, so the batch settled having uploaded nothing.
    const { inFlight } = setup(3, Number.NaN);

    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(1));
    await settle(inFlight, 1);
    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(2));
    await settle(inFlight, 2);
    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(3));
  });

  it('stops pulling new files once the batch is aborted', async () => {
    const { inFlight } = setup(4, 2);

    await waitFor(() => expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(2));

    // Cancel the batch (first batch in a fresh store is uploadId 1), then let
    // the two in-flight requests die with the abort error the real XHR helper
    // throws — no further file may start.
    await act(async () => {
      abortUpload(1);
      inFlight[0].reject(new UploadAbortedError('aborted'));
      inFlight[1].reject(new UploadAbortedError('aborted'));
    });

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    expect(mockUploadFileViaXHR).toHaveBeenCalledTimes(2);
  });
});
