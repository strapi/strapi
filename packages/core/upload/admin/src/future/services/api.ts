import { Dispatch } from '@reduxjs/toolkit';
import { adminApi } from '@strapi/admin/strapi-admin';

import {
  openUploadProgress,
  setFileUploading,
  setFileProgress,
  setFileComplete,
  setFileError,
  setFileMetadataGenerating,
  setFileMetadataResult,
  setUploadFailed,
  retryCancelledFiles,
} from '../store/uploadProgress';
import { createRafBatcher } from '../utils/createRafBatcher';
import { getFilenameFromUrl } from '../utils/files';

import { uploadFileViaXHR, UploadAbortedError } from './uploadFileViaXHR';

import type {
  CreateFilesStream,
  CreateFilesStreamEvents,
  File as UploadedFile,
  UnstableGenerateAIMetadata,
  UploadFileInfo,
} from '../../../../shared/contracts/files';
import type { FileMetadataResultStatus } from '../store/uploadProgress';

interface UploadFilesArgs {
  formData: FormData;
  totalFiles: number;
  /**
   * How many files to upload in parallel — the `concurrentUploadRequests`
   * settings value. Defaults to 1 (sequential).
   */
  concurrency?: number;
  /** Whether AI metadata generation is enabled (EE AI available + `settings.aiMetadata`). */
  generateAiMetadata: boolean;
}

interface UploadFromUrlsArgs {
  urls: string[];
  folderId: number | null;
  generateAiMetadata: boolean;
}

interface RootState {
  admin_app: {
    token?: string | null;
  };
  uploadProgress: {
    uploadId: number;
    files: Array<{
      index: number;
      name: string;
      size: number;
      status: 'pending' | 'uploading' | 'complete' | 'error' | 'cancelled';
    }>;
  };
}

/**
 * A single file plus the `fileInfo` it was queued with.
 * Retained in {@link uploadRegistry} so cancelled files can be retried without
 * the user re-selecting them. `File`/`AbortController` are non-serializable, so
 * they live here rather than in Redux.
 */
interface UploadEntry {
  file: File;
  fileInfo: UploadFileInfo;
}

/**
 * Everything a batch needs to be replayed on retry: the original entries plus the
 * flags it was started with (AI-metadata and upload concurrency). These live here
 * rather than in Redux because `retryCancelledFiles` takes no args and the page
 * that owns `useAIAvailability` / the settings value is not involved in the retry.
 */
interface UploadBatch {
  entries: UploadEntry[];
  generateAiMetadata: boolean;
  concurrency: number;
}

/**
 * Stores the original upload batch (keyed by uploadId) to enable retry.
 */
const uploadRegistry = new Map<number, UploadBatch>();

const registerUploadEntries = (
  uploadId: number,
  entries: UploadEntry[],
  generateAiMetadata: boolean,
  concurrency: number
) => {
  uploadRegistry.set(uploadId, { entries, generateAiMetadata, concurrency });
};

const getUploadEntries = (uploadId: number): UploadBatch | undefined => {
  return uploadRegistry.get(uploadId);
};

/**
 * Manages abort controllers for in-flight uploads.
 *
 * Design decision: Uses a Map to track uploads by their unique uploadId.
 * Redux state cannot store function references (abort controllers), RTK Query's
 * signal is only accessible within the queryFn, and the upload is triggered in
 * AssetsPage but cancelled from UploadProgressDialog.
 */
const abortControllers = new Map<number, AbortController>();

const registerAbortController = (uploadId: number, controller: AbortController) => {
  abortControllers.set(uploadId, controller);
};

const unregisterAbortController = (uploadId: number) => {
  abortControllers.delete(uploadId);
};

/**
 * Aborts an upload by its uploadId.
 * Called from the UploadProgressDialog when the user clicks cancel or close.
 */
export const abortUpload = (uploadId: number) => {
  const controller = abortControllers.get(uploadId);
  if (controller) {
    controller.abort();
    unregisterAbortController(uploadId);
  }
};

/**
 * Error shape returned by upload operations.
 * Matches RTK Query's expected return type for queryFn.
 */
interface UploadError {
  name: 'UnknownError';
  message: string;
  status?: number;
}

/**
 * The store's dispatch also accepts thunks, which is what RTK Query's
 * `endpoint.initiate(...)` returns — the plain `Dispatch` action type can't express that.
 */
type AppDispatch = Dispatch &
  (<T>(thunk: T) => T extends (...args: never[]) => infer R ? R : never);

type UploadPoolResult =
  | { data: UploadedFile[]; error?: undefined }
  | { error: UploadError; data?: undefined };

/** Maps a server per-file outcome onto the row's terminal metadata status. */
const METADATA_STATUS_BY_RESULT: Record<
  UnstableGenerateAIMetadata.FileStatus,
  FileMetadataResultStatus
> = {
  success: 'generated',
  skipped: 'skipped',
  error: 'failed',
};

/**
 * Kicks off AI metadata generation for a freshly uploaded file.
 *
 * Deliberately fire-and-forget — the caller must NOT await it:
 *  - generation for file N overlaps the upload of file N+1;
 *  - a generation failure can never affect the upload result (the upload already
 *    succeeded), which is why the promise is fully swallowed here.
 *
 * Every uploaded file is sent, including non-images: the server already classifies
 * them (`ai-metadata.generateForFiles` returns `skipped` for anything whose mime
 * isn't `image/*`) and duplicating that rule here would let the two drift apart.
 * The upshot is that a non-image now reports "Metadata generation skipped" rather
 * than silently showing no metadata state at all.
 */
export const maybeGenerateMetadata = ({
  file,
  index,
  uploadId,
  enabled,
  dispatch,
}: {
  file: UploadedFile;
  index: number;
  uploadId: number;
  enabled: boolean;
  dispatch: Dispatch;
}): void => {
  if (!enabled || typeof file.id !== 'number') {
    return;
  }

  dispatch(setFileMetadataGenerating({ index, uploadId }));

  // `uploadApi` is declared below but only read at call time, long after the module
  // has finished evaluating.
  const promise = (dispatch as AppDispatch)(
    uploadApi.endpoints.generateAiMetadata.initiate({ fileIds: [file.id] })
  );

  promise
    .unwrap()
    .then((results) => {
      const result = results?.find((r) => r.id === file.id) ?? results?.[0];
      dispatch(
        setFileMetadataResult({
          index,
          uploadId,
          status: result ? METADATA_STATUS_BY_RESULT[result.status] : 'failed',
        })
      );
    })
    .catch(() => {
      dispatch(setFileMetadataResult({ index, uploadId, status: 'failed' }));
    });
};

/**
 * Uploads the given entry indices one at a time through the single-file endpoint.
 *
 * For each file: dispatches "uploading", wires `XHR.upload.onprogress` through a
 * per-frame batcher to `setFileProgress`, awaits the XHR, then dispatches
 * "complete" or "error". Each file is wrapped in its own try/catch so one failure
 * does not stop the batch. An abort stops the loop without starting further files.
 */
const runUploadPool = async ({
  entries,
  indices,
  token,
  uploadId,
  abortController,
  dispatch,
  concurrency = 1,
  generateAiMetadata,
}: {
  entries: UploadEntry[];
  indices: number[];
  token: string | null | undefined;
  uploadId: number;
  abortController: AbortController;
  dispatch: Dispatch;
  /** Parallel workers pulling from the queue. 1 (the default) = sequential. */
  concurrency?: number;
  generateAiMetadata: boolean;
}): Promise<UploadPoolResult> => {
  const url = `${window.strapi.backendURL}/upload/unstable/upload-file`;
  const uploaded: UploadedFile[] = [];

  // Shared queue: each worker shifts the next index when it frees up, so N
  // files are in flight at any moment (not N-sized waves). With concurrency 1
  // this degenerates to the original strictly sequential loop.
  const queue = [...indices];

  const uploadOne = async (index: number) => {
    const entry = entries[index];
    if (!entry) {
      return;
    }

    const fileName = entry.fileInfo?.name ?? entry.file.name;

    dispatch(setFileUploading({ name: fileName, index, size: entry.file.size }));

    const formData = new FormData();
    formData.append('files', entry.file);
    formData.append('fileInfo', JSON.stringify(entry.fileInfo));

    // Coalesce high-frequency progress events into one dispatch per frame.
    const batcher = createRafBatcher<number>((bytes) => {
      dispatch(setFileProgress({ index, bytes }));
    });

    try {
      const file = await uploadFileViaXHR(url, token, formData, abortController.signal, (bytes) =>
        batcher.schedule(bytes)
      );
      batcher.cancel();
      uploaded.push(file);
      dispatch(setFileComplete({ index, file }));

      // Not awaited: overlaps with the next file's upload and can't fail the batch.
      maybeGenerateMetadata({
        file,
        index,
        uploadId,
        enabled: generateAiMetadata,
        dispatch,
      });
    } catch (err) {
      batcher.cancel();

      if (err instanceof UploadAbortedError) {
        // Batch was cancelled — the worker loop checks the signal and stops.
        // cancelUpload (dispatched from the dialog) marks the remaining rows.
        return;
      }

      const message = err instanceof Error ? err.message : 'Upload failed';
      dispatch(setFileError({ index, name: fileName, message }));
    }
  };

  // Guard non-finite/invalid values (NaN, Infinity, <1): `Math.floor(NaN)`
  // would propagate through Math.max to `Array.from({ length: NaN })` = zero
  // workers, silently uploading nothing. Anything invalid falls back to 1.
  const requested = Number.isFinite(concurrency) ? Math.floor(concurrency) : 1;
  const workerCount = Math.min(Math.max(1, requested), queue.length);

  const worker = async () => {
    while (queue.length > 0) {
      if (abortController.signal.aborted) {
        break;
      }

      const index = queue.shift();
      if (index === undefined) {
        break;
      }

      // eslint-disable-next-line no-await-in-loop
      await uploadOne(index);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  unregisterAbortController(uploadId);

  return { data: uploaded };
};

/* -------------------------------------------------------------------------------------------------
 * URL upload flow (SSE) — kept as-is for this iteration
 * -----------------------------------------------------------------------------------------------*/

/**
 * Parses a raw SSE text chunk into event/data pairs.
 *
 * SSE format:
 *   event: <eventName>\n
 *   data: <json>\n
 *   \n
 */
const parseSSEEvents = (chunk: string): Array<{ event: string; data: string }> => {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = chunk.split('\n\n').filter(Boolean);

  for (const block of blocks) {
    let event = '';
    let data = '';

    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) {
        event = line.slice(7);
      } else if (line.startsWith('data: ')) {
        data = line.slice(6);
      }
    }

    if (event && data) {
      events.push({ event, data });
    }
  }

  return events;
};

/**
 * Makes a streaming upload-from-URLs request to the server.
 * Sends URLs as JSON body instead of FormData.
 */
const fetchUrlUploadStream = async ({
  token,
  urls,
  folderId,
  signal,
}: {
  token: string | null | undefined;
  urls: string[];
  folderId: number | null;
  signal: AbortSignal;
}): Promise<Response> => {
  const backendURL = window.strapi.backendURL;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${backendURL}/upload/unstable/stream-from-urls`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ urls, folderId }),
    signal,
  });
};

/**
 * Processes an SSE stream from the URL upload endpoint.
 * Dispatches Redux actions for each file event and returns the final result.
 */
const processSSEStream = async ({
  response,
  dispatch,
  uploadId,
  generateAiMetadata,
}: {
  response: Response;
  dispatch: Dispatch;
  uploadId: number;
  generateAiMetadata: boolean;
}): Promise<CreateFilesStream.Response | null> => {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let streamResult: CreateFilesStream.Response | null = null;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE events from the buffer
    const lastDoubleNewline = buffer.lastIndexOf('\n\n');
    if (lastDoubleNewline === -1) {
      // No complete events yet, keep buffering
      // eslint-disable-next-line no-continue
      continue;
    }

    const completePart = buffer.slice(0, lastDoubleNewline + 2);
    buffer = buffer.slice(lastDoubleNewline + 2);

    const events = parseSSEEvents(completePart);

    for (const { event, data } of events) {
      const parsed = JSON.parse(data);
      const index = parsed.index as number;

      switch (event) {
        case 'file:fetching': {
          // URL is being fetched server-side - mark as uploading (processing)
          dispatch(setFileUploading({ name: parsed.url as string, index, size: 0 }));
          break;
        }
        case 'file:uploading': {
          const payload = parsed as CreateFilesStreamEvents.FileUploadingEvent;
          dispatch(setFileUploading({ name: payload.name, index, size: payload.size }));
          break;
        }
        case 'file:complete': {
          const payload = parsed as CreateFilesStreamEvents.FileCompleteEvent;
          dispatch(setFileComplete({ index, file: payload.file }));

          // Same fire-and-forget semantics as the file flow.
          maybeGenerateMetadata({
            file: payload.file,
            index,
            uploadId,
            enabled: generateAiMetadata,
            dispatch,
          });
          break;
        }
        case 'file:error': {
          const payload = parsed as CreateFilesStreamEvents.FileErrorEvent;
          dispatch(setFileError({ index, name: payload.name, message: payload.message }));
          break;
        }
        case 'stream:complete': {
          const payload = parsed as CreateFilesStreamEvents.StreamCompleteEvent;
          streamResult = {
            data: payload.data,
            errors: payload.errors,
          };
          break;
        }
        default:
          console.error(`[SSE Upload] unknown event: ${event}`, parsed);
      }
    }
  }

  return streamResult;
};

const uploadApi = adminApi
  .enhanceEndpoints({
    addTagTypes: ['Asset', 'Folder'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      /**
       * Upload files to `/upload/unstable/upload-file`, one request per file,
       * through a worker pool of `concurrency` parallel requests (default 1 =
       * sequential). Real per-file byte progress comes from
       * `XHR.upload.onprogress`.
       */
      uploadFiles: builder.mutation<UploadedFile[], UploadFilesArgs>({
        queryFn: async (
          { formData, totalFiles, concurrency = 1, generateAiMetadata },
          { dispatch, getState }
        ) => {
          const token = (getState() as RootState).admin_app?.token;

          // Extract the original files and their per-file fileInfo from the combined FormData.
          const files = formData.getAll('files') as File[];
          const fileInfoJson = formData.get('fileInfo') as string;
          const fileInfoArray = JSON.parse(fileInfoJson) as UploadFileInfo[];

          const entries: UploadEntry[] = files.map((file, index) => ({
            file,
            fileInfo: fileInfoArray[index] ?? {
              name: file.name,
              caption: null,
              alternativeText: null,
              folder: null,
            },
          }));

          const fileNames = entries.map((entry) => entry.fileInfo.name ?? entry.file.name);
          const fileSizes = entries.map((entry) => entry.file.size);

          // Open the progress dialog
          dispatch(openUploadProgress({ totalFiles, fileNames, fileSizes }));

          // Get the uploadId from state after dispatching
          const uploadId = (getState() as RootState).uploadProgress.uploadId;

          // Store original entries for retry functionality
          registerUploadEntries(uploadId, entries, generateAiMetadata, concurrency);

          // One AbortController per batch
          const abortController = new AbortController();
          registerAbortController(uploadId, abortController);

          return runUploadPool({
            entries,
            indices: entries.map((_, index) => index),
            token,
            uploadId,
            abortController,
            dispatch,
            concurrency,
            generateAiMetadata,
          });
        },
        // `Folder, LIST` refreshes the folder header count, which changes when
        // files are added to it.
        invalidatesTags: [
          { type: 'Asset', id: 'LIST' },
          { type: 'Folder', id: 'LIST' },
        ],
      }),

      /**
       * Upload a single, already-prepared file WITHOUT opening the global
       * upload-progress dialog. For flows that create one asset programmatically
       * (e.g. crop → "Save as copy"), where the bulk-upload progress UI is
       * inappropriate. Same endpoint as `uploadFiles`, minus the progress/retry
       * machinery.
       */
      uploadFileSilently: builder.mutation<UploadedFile, UploadEntry>({
        queryFn: async ({ file, fileInfo }, { getState }) => {
          const token = (getState() as RootState).admin_app?.token;
          const url = `${window.strapi.backendURL}/upload/unstable/upload-file`;

          const formData = new FormData();
          formData.append('files', file);
          formData.append('fileInfo', JSON.stringify(fileInfo));

          try {
            const uploaded = await uploadFileViaXHR(
              url,
              token,
              formData,
              new AbortController().signal,
              () => {}
            );
            return { data: uploaded };
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Upload failed';
            return { error: { name: 'UnknownError', message } };
          }
        },
        // `Folder, LIST` refreshes the folder header count, which changes when
        // files are added to it.
        invalidatesTags: [
          { type: 'Asset', id: 'LIST' },
          { type: 'Folder', id: 'LIST' },
        ],
      }),

      /**
       * Retry uploading cancelled files.
       * Maps cancelled rows back to their original entries and re-runs only those
       * through the same upload pool with a fresh AbortController.
       */
      retryCancelledFiles: builder.mutation<UploadedFile[], void>({
        queryFn: async (_arg, { dispatch, getState }) => {
          const { uploadId, files: stateFiles } = (getState() as RootState).uploadProgress;
          const token = (getState() as RootState).admin_app?.token;

          const cancelledIndices = stateFiles
            .filter((f) => f.status === 'cancelled')
            .map((f) => f.index);

          if (cancelledIndices.length === 0) {
            return { error: { name: 'UnknownError', message: 'No cancelled files to retry' } };
          }

          const batch = getUploadEntries(uploadId);
          if (!batch) {
            return { error: { name: 'UnknownError', message: 'Original files not found' } };
          }

          // Reset cancelled files back to pending
          dispatch(retryCancelledFiles());

          // Fresh AbortController for the retry run
          const abortController = new AbortController();
          registerAbortController(uploadId, abortController);

          return runUploadPool({
            entries: batch.entries,
            indices: cancelledIndices,
            token,
            uploadId,
            abortController,
            dispatch,
            // Replay the retried rows with the flags the batch was started with.
            concurrency: batch.concurrency,
            generateAiMetadata: batch.generateAiMetadata,
          });
        },
        // `Folder, LIST` refreshes the folder header count, which changes when
        // files are added to it.
        invalidatesTags: [
          { type: 'Asset', id: 'LIST' },
          { type: 'Folder', id: 'LIST' },
        ],
      }),

      /**
       * Upload files from URLs.
       * Sends URLs to the server which fetches and uploads them (SSE flow, unchanged).
       */
      uploadFromUrls: builder.mutation<CreateFilesStream.Response, UploadFromUrlsArgs>({
        queryFn: async ({ urls, folderId, generateAiMetadata }, { dispatch, getState }) => {
          const token = (getState() as RootState).admin_app?.token;

          // Extract filenames from URLs for the progress dialog
          const fileNames = urls.map((url) => getFilenameFromUrl(url));

          // Open progress dialog with all URLs as pending files
          dispatch(
            openUploadProgress({
              totalFiles: urls.length,
              fileNames,
            })
          );

          // Get the uploadId from state after dispatching
          const uploadId = (getState() as RootState).uploadProgress.uploadId;

          // Create abort controller for this upload
          const abortController = new AbortController();
          registerAbortController(uploadId, abortController);

          try {
            // Send URLs to server for fetching and uploading
            const response = await fetchUrlUploadStream({
              token,
              urls,
              folderId,
              signal: abortController.signal,
            });

            if (!response.ok || !response.body) {
              unregisterAbortController(uploadId);

              let errorMessage = 'Upload request failed';
              try {
                const errorData = await response.json();
                if (errorData.error?.message) {
                  errorMessage = errorData.error.message;
                } else if (errorData.message) {
                  errorMessage = errorData.message;
                }
              } catch {
                errorMessage = `Upload failed with status ${response.status}`;
              }

              dispatch(setUploadFailed({ message: errorMessage }));

              return {
                error: {
                  name: 'UnknownError' as const,
                  message: errorMessage,
                  status: response.status,
                },
              };
            }

            // Process SSE stream from server
            const streamResult = await processSSEStream({
              response,
              dispatch,
              uploadId,
              generateAiMetadata,
            });

            unregisterAbortController(uploadId);

            if (streamResult && streamResult.data.length > 0) {
              return { data: streamResult };
            }

            return { data: { data: [], errors: [] } };
          } catch (err) {
            unregisterAbortController(uploadId);

            if (err instanceof DOMException && err.name === 'AbortError') {
              return { error: { name: 'UnknownError' as const, message: 'Upload cancelled' } };
            }

            const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
            dispatch(setUploadFailed({ message: errorMessage }));

            return {
              error: {
                name: 'UnknownError' as const,
                message: errorMessage,
              },
            };
          }
        },
        // `Folder, LIST` refreshes the folder header count, which changes when
        // files are added to it.
        invalidatesTags: [
          { type: 'Asset', id: 'LIST' },
          { type: 'Folder', id: 'LIST' },
        ],
      }),

      /**
       * Generate AI metadata (alt text + caption) for the given assets.
       * Synchronous: resolves once every file has been processed and reports the
       * outcome per file, so non-images and individual failures don't fail the
       * whole batch. Existing alt text and captions are never overwritten.
       *
       * Lives here rather than in `assets.ts` because the upload flows dispatch it
       * directly via `initiate()` after each file completes, and `assets.ts` already
       * imports from this module — defining it there would be a circular import.
       * Re-exported from `assets.ts` for the components that consume the hook.
       */
      generateAiMetadata: builder.mutation<
        UnstableGenerateAIMetadata.Response['data'],
        { fileIds: number[] }
      >({
        query: ({ fileIds }) => ({
          url: '/upload/unstable/generate-ai-metadata',
          method: 'POST',
          data: { fileIds },
        }),
        transformResponse: (response: { data: UnstableGenerateAIMetadata.Response['data'] }) =>
          response.data,
        invalidatesTags: (_result, _error, { fileIds }) => [
          ...fileIds.map((id) => ({ type: 'Asset' as const, id })),
          { type: 'Asset' as const, id: 'LIST' },
        ],
      }),
    }),
  });

export const {
  useUploadFilesMutation,
  useUploadFileSilentlyMutation,
  useRetryCancelledFilesMutation,
  useUploadFromUrlsMutation,
  useGenerateAiMetadataMutation,
} = uploadApi;
export { uploadApi };
