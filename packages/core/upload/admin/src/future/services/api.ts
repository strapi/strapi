import { adminApi } from '@strapi/admin/strapi-admin';

import {
  openUploadProgress,
  setFileUploading,
  setFileComplete,
  setFileError,
  updateProgress,
} from '../store/uploadProgress';

import type {
  CreateFilesStream,
  CreateFilesStreamEvents,
} from '../../../../shared/contracts/files';

interface UploadFilesArgs {
  formData: FormData;
  totalFiles: number;
}

interface RootState {
  admin_app: {
    token?: string | null;
  };
  uploadProgress: {
    uploadId: number;
  };
}

/**
 * Manages abort controllers for in-flight uploads.
 *
 * Design decision: Uses a Map to track uploads by their unique uploadId.
 * This approach is necessary because:
 * 1. Redux state cannot store function references (abort controllers)
 * 2. RTK Query's signal is only accessible within the queryFn
 * 3. The upload is triggered in AssetsPage but cancelled from UploadProgressDialog
 *
 * The uploadId ensures we abort the correct upload even if multiple uploads
 * are queued, though the current UI prevents simultaneous uploads.
 */
const abortControllers = new Map<number, AbortController>();

/**
 * Registers an abort controller for a specific upload.
 * Called internally when an upload starts.
 */
const registerAbortController = (uploadId: number, controller: AbortController) => {
  abortControllers.set(uploadId, controller);
};

/**
 * Removes an abort controller when an upload completes or is aborted.
 */
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

const uploadApi = adminApi
  .enhanceEndpoints({
    addTagTypes: ['Asset', 'Folder'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      /**
       * Stream upload files to the /upload/unstable/stream endpoint.
       * Reads SSE stream for per-file progress updates.
       */
      uploadFilesStream: builder.mutation<CreateFilesStream.Response, UploadFilesArgs>({
        queryFn: async ({ formData, totalFiles }, { dispatch, getState }) => {
          const token = (getState() as RootState).admin_app?.token;

          // Extract file names and sizes from FormData
          const files = formData.getAll('files') as File[];
          const fileInfoJson = formData.get('fileInfo') as string;
          const fileInfo = JSON.parse(fileInfoJson) as Array<{ name: string }>;
          const fileNames = fileInfo.map((info) => info.name);
          const fileSizes = files.map((file) => file.size);

          // Open the progress dialog and get the uploadId
          dispatch(openUploadProgress({ totalFiles, fileNames, fileSizes }));
          dispatch(updateProgress(0));

          // Get the uploadId from state after dispatching
          const uploadId = (getState() as RootState).uploadProgress.uploadId;

          // Create abort controller for this upload
          const abortController = new AbortController();
          registerAbortController(uploadId, abortController);

          try {
            const backendURL = window.strapi.backendURL;
            const headers: Record<string, string> = {};
            if (token) {
              headers.Authorization = `Bearer ${token}`;
            }

            const response = await fetch(`${backendURL}/upload/unstable/stream`, {
              method: 'POST',
              headers,
              body: formData,
              signal: abortController.signal,
            });

            if (!response.ok || !response.body) {
              unregisterAbortController(uploadId);
              return {
                error: {
                  name: 'UnknownError',
                  message: 'Upload request failed',
                  status: response.status,
                },
              };
            }

            const reader = response.body.getReader();
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

                switch (event) {
                  case 'file:uploading': {
                    const payload = parsed as CreateFilesStreamEvents.FileUploadingEvent;
                    dispatch(
                      setFileUploading({
                        name: payload.name,
                        index: payload.index,
                        total: payload.total,
                        size: payload.size,
                      })
                    );
                    break;
                  }
                  case 'file:complete': {
                    const payload = parsed as CreateFilesStreamEvents.FileCompleteEvent;
                    dispatch(
                      setFileComplete({
                        index: payload.index,
                        file: payload.file,
                      })
                    );
                    break;
                  }
                  case 'file:error': {
                    const payload = parsed as CreateFilesStreamEvents.FileErrorEvent;
                    dispatch(
                      setFileError({
                        index: payload.index,
                        name: payload.name,
                        message: payload.message,
                      })
                    );
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
                    // eslint-disable-next-line no-console
                    console.log(`[Upload SSE] unknown event: ${event}`, parsed);
                }
              }
            }

            unregisterAbortController(uploadId);

            if (streamResult && streamResult.data.length > 0) {
              return { data: streamResult };
            }

            return {
              error: {
                name: 'UnknownError',
                message: 'No files were uploaded successfully',
              },
            };
          } catch (err) {
            unregisterAbortController(uploadId);

            if (err instanceof DOMException && err.name === 'AbortError') {
              return {
                error: { name: 'UnknownError', message: 'Upload cancelled' },
              };
            }

            return {
              error: {
                name: 'UnknownError',
                message: err instanceof Error ? err.message : 'Network error occurred',
              },
            };
          }
        },
        invalidatesTags: [{ type: 'Asset', id: 'LIST' }],
      }),
    }),
  });

export const { useUploadFilesStreamMutation } = uploadApi;
export { uploadApi };
