import { Dispatch } from '@reduxjs/toolkit';
import { adminApi } from '@strapi/admin/strapi-admin';

import {
  openUploadProgress,
  setFileUploading,
  setFileProgress,
  setFileComplete,
  setFileError,
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
  UploadFileInfo,
} from '../../../../shared/contracts/files';

interface UploadFilesArgs {
  formData: FormData;
  totalFiles: number;
}

interface UploadFromUrlsArgs {
  urls: string[];
  folderId: number | null;
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
 * Stores the original upload entries for a batch (keyed by uploadId) to enable retry.
 */
const uploadRegistry = new Map<number, UploadEntry[]>();

const registerUploadEntries = (uploadId: number, entries: UploadEntry[]) => {
  uploadRegistry.set(uploadId, entries);
};

const getUploadEntries = (uploadId: number): UploadEntry[] | undefined => {
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

type SequentialUploadResult =
  | { data: UploadedFile[]; error?: undefined }
  | { error: UploadError; data?: undefined };

/**
 * Uploads the given entry indices one at a time through the single-file endpoint.
 *
 * For each file: dispatches "uploading", wires `XHR.upload.onprogress` through a
 * per-frame batcher to `setFileProgress`, awaits the XHR, then dispatches
 * "complete" or "error". Each file is wrapped in its own try/catch so one failure
 * does not stop the batch. An abort stops the loop without starting further files.
 */
const runSequentialUpload = async ({
  entries,
  indices,
  token,
  uploadId,
  abortController,
  dispatch,
}: {
  entries: UploadEntry[];
  indices: number[];
  token: string | null | undefined;
  uploadId: number;
  abortController: AbortController;
  dispatch: Dispatch;
}): Promise<SequentialUploadResult> => {
  const url = `${window.strapi.backendURL}/upload/unstable/upload-file`;
  const uploaded: UploadedFile[] = [];

  for (const index of indices) {
    if (abortController.signal.aborted) {
      break;
    }

    const entry = entries[index];
    if (!entry) {
      // eslint-disable-next-line no-continue
      continue;
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
    } catch (err) {
      batcher.cancel();

      if (err instanceof UploadAbortedError) {
        // Batch was cancelled — stop without starting further files.
        // cancelUpload (dispatched from the dialog) marks the remaining rows.
        break;
      }

      const message = err instanceof Error ? err.message : 'Upload failed';
      dispatch(setFileError({ index, name: fileName, message }));
    }
  }

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
}: {
  response: Response;
  dispatch: Dispatch;
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
       * Upload files sequentially, one request per file, to `/upload/unstable/upload-file`.
       * Real per-file byte progress comes from `XHR.upload.onprogress`.
       */
      uploadFiles: builder.mutation<UploadedFile[], UploadFilesArgs>({
        queryFn: async ({ formData, totalFiles }, { dispatch, getState }) => {
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
          registerUploadEntries(uploadId, entries);

          // One AbortController per batch
          const abortController = new AbortController();
          registerAbortController(uploadId, abortController);

          return runSequentialUpload({
            entries,
            indices: entries.map((_, index) => index),
            token,
            uploadId,
            abortController,
            dispatch,
          });
        },
        invalidatesTags: [{ type: 'Asset', id: 'LIST' }],
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
        invalidatesTags: [{ type: 'Asset', id: 'LIST' }],
      }),

      /**
       * Retry uploading cancelled files.
       * Maps cancelled rows back to their original entries and re-runs only those
       * through the same sequential loop with a fresh AbortController.
       */
      retryCancelledFiles: builder.mutation<UploadedFile[], void>({
        queryFn: async (_, { dispatch, getState }) => {
          const { uploadId, files: stateFiles } = (getState() as RootState).uploadProgress;
          const token = (getState() as RootState).admin_app?.token;

          const cancelledIndices = stateFiles
            .filter((f) => f.status === 'cancelled')
            .map((f) => f.index);

          if (cancelledIndices.length === 0) {
            return { error: { name: 'UnknownError', message: 'No cancelled files to retry' } };
          }

          const entries = getUploadEntries(uploadId);
          if (!entries) {
            return { error: { name: 'UnknownError', message: 'Original files not found' } };
          }

          // Reset cancelled files back to pending
          dispatch(retryCancelledFiles());

          // Fresh AbortController for the retry run
          const abortController = new AbortController();
          registerAbortController(uploadId, abortController);

          return runSequentialUpload({
            entries,
            indices: cancelledIndices,
            token,
            uploadId,
            abortController,
            dispatch,
          });
        },
        invalidatesTags: [{ type: 'Asset', id: 'LIST' }],
      }),

      /**
       * Upload files from URLs.
       * Sends URLs to the server which fetches and uploads them (SSE flow, unchanged).
       */
      uploadFromUrls: builder.mutation<CreateFilesStream.Response, UploadFromUrlsArgs>({
        queryFn: async ({ urls, folderId }, { dispatch, getState }) => {
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
        invalidatesTags: [{ type: 'Asset', id: 'LIST' }],
      }),
    }),
  });

export const {
  useUploadFilesMutation,
  useUploadFileSilentlyMutation,
  useRetryCancelledFilesMutation,
  useUploadFromUrlsMutation,
} = uploadApi;
export { uploadApi };
