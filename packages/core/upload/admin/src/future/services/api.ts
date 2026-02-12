import { Dispatch } from '@reduxjs/toolkit';
import { adminApi } from '@strapi/admin/strapi-admin';

import {
  openUploadProgress,
  setFileUploading,
  setFileComplete,
  setFileError,
  updateProgress,
  setUploadFailed,
  retryCancelledFiles,
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
    files: Array<{
      index: number;
      name: string;
      size: number;
      status: 'pending' | 'uploading' | 'complete' | 'error' | 'cancelled';
    }>;
  };
}

/**
 * Stores original File objects for retry functionality.
 *
 * Similar to abortControllers, File objects cannot be stored in Redux state
 * (they are not serializable). This Map allows us to retry cancelled uploads
 * by retrieving the original files using the uploadId.
 */
const uploadedFiles = new Map<number, File[]>();

/**
 * Registers files for a specific upload to enable retry.
 */
const registerUploadedFiles = (uploadId: number, files: File[]) => {
  uploadedFiles.set(uploadId, files);
};

/**
 * Retrieves stored files for an upload.
 */
const getUploadedFiles = (uploadId: number): File[] | undefined => {
  return uploadedFiles.get(uploadId);
};

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

/**
 * Makes a streaming upload request to the server.
 *
 * We use fetch directly instead of RTK Query's fetchBaseQuery because:
 * 1. We need access to the raw Response to read the body as a stream
 * 2. RTK Query's baseQuery awaits the full response and parses it as JSON,
 *    which doesn't work for Server-Sent Events (SSE) streaming
 * 3. The stream must be read incrementally via response.body.getReader()
 *    to dispatch progress updates as files upload
 */
const fetchUploadStream = async ({
  token,
  formData,
  signal,
}: {
  token: string | null | undefined;
  formData: FormData;
  signal: AbortSignal;
}): Promise<Response> => {
  const backendURL = window.strapi.backendURL;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${backendURL}/upload/unstable/stream`, {
    method: 'POST',
    headers,
    body: formData,
    signal,
  });
};

/**
 * Options for processing an SSE upload stream.
 */
interface ProcessSSEStreamOptions {
  response: Response;
  dispatch: Dispatch;
  indexMapper?: (serverIndex: number) => number;
}

/**
 * Processes an SSE stream from the upload endpoint.
 * Dispatches Redux actions for each file event and returns the final result.
 *
 * @param options.response - The fetch Response object with SSE body
 * @param options.dispatch - Redux dispatch function
 * @param options.indexMapper - Optional function to map server indices to state indices (for retry)
 * @param options.logPrefix - Optional prefix for console logs
 * @returns The stream result or null if no files completed
 */
const processSSEStream = async ({
  response,
  dispatch,
  indexMapper = (i) => i,
}: ProcessSSEStreamOptions): Promise<CreateFilesStream.Response | null> => {
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
      const mappedIndex = indexMapper(parsed.index as number);

      switch (event) {
        case 'file:uploading': {
          const payload = parsed as CreateFilesStreamEvents.FileUploadingEvent;
          dispatch(
            setFileUploading({
              name: payload.name,
              index: mappedIndex,
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
              index: mappedIndex,
              file: payload.file,
            })
          );
          break;
        }
        case 'file:error': {
          const payload = parsed as CreateFilesStreamEvents.FileErrorEvent;
          dispatch(
            setFileError({
              index: mappedIndex,
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

          // Store original files for retry functionality
          registerUploadedFiles(uploadId, files);

          // Create abort controller for this upload
          const abortController = new AbortController();
          registerAbortController(uploadId, abortController);

          try {
            const response = await fetchUploadStream({
              token,
              formData,
              signal: abortController.signal,
            });

            if (!response.ok || !response.body) {
              unregisterAbortController(uploadId);

              // Try to parse error message from response
              let errorMessage = 'Upload request failed';
              try {
                const errorData = await response.json();
                if (errorData.error?.message) {
                  errorMessage = errorData.error.message;
                } else if (errorData.message) {
                  errorMessage = errorData.message;
                }
              } catch {
                // If we can't parse the error, use a generic message with status code
                errorMessage = `Upload failed with status ${response.status}`;
              }

              // Mark all files as failed in the UI
              dispatch(setUploadFailed({ message: errorMessage }));

              return {
                error: {
                  name: 'UnknownError',
                  message: errorMessage,
                  status: response.status,
                },
              };
            }

            const streamResult = await processSSEStream({
              response,
              dispatch,
            });

            unregisterAbortController(uploadId);

            if (streamResult && streamResult.data.length > 0) {
              return { data: streamResult };
            }

            // If stream ended without completing any files, mark all as failed
            const errorMessage = 'No files were uploaded successfully';
            dispatch(setUploadFailed({ message: errorMessage }));

            return {
              error: {
                name: 'UnknownError',
                message: errorMessage,
              },
            };
          } catch (err) {
            unregisterAbortController(uploadId);

            if (err instanceof DOMException && err.name === 'AbortError') {
              // Don't mark as failed for user-initiated cancellations
              return {
                error: { name: 'UnknownError', message: 'Upload cancelled' },
              };
            }

            // For network errors or other exceptions, mark all files as failed
            const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
            dispatch(setUploadFailed({ message: errorMessage }));

            return {
              error: {
                name: 'UnknownError',
                message: errorMessage,
              },
            };
          }
        },
        invalidatesTags: [{ type: 'Asset', id: 'LIST' }],
      }),

      /**
       * Retry uploading cancelled files.
       * Retrieves original File objects and re-uploads only the cancelled ones.
       */
      retryCancelledFilesStream: builder.mutation<CreateFilesStream.Response, void>({
        queryFn: async (_, { dispatch, getState }) => {
          const token = (getState() as RootState).admin_app?.token;
          const { uploadId, files: stateFiles } = (getState() as RootState).uploadProgress;

          // Get cancelled files with their original indices
          const cancelledFiles = stateFiles.filter((f) => f.status === 'cancelled');
          if (cancelledFiles.length === 0) {
            return { error: { name: 'UnknownError', message: 'No cancelled files to retry' } };
          }

          // Get the original File objects
          const originalFiles = getUploadedFiles(uploadId);
          if (!originalFiles) {
            return { error: { name: 'UnknownError', message: 'Original files not found' } };
          }

          // Build mapping from new index to original index
          const indexMapping = cancelledFiles.map((f) => f.index);
          const filesToRetry = cancelledFiles.map((f) => originalFiles[f.index]);

          // Reset cancelled files to pending
          dispatch(retryCancelledFiles());

          // Build FormData for retry
          const formData = new FormData();
          const fileInfoArray = filesToRetry.map((file) => ({
            name: file.name,
            caption: null,
            alternativeText: null,
            folder: null, // TODO: preserve folder from original upload if needed
          }));

          filesToRetry.forEach((file) => {
            formData.append('files', file);
          });
          formData.append('fileInfo', JSON.stringify(fileInfoArray));

          // Create abort controller for this retry
          const abortController = new AbortController();
          registerAbortController(uploadId, abortController);

          try {
            const response = await fetchUploadStream({
              token,
              formData,
              signal: abortController.signal,
            });

            if (!response.ok || !response.body) {
              unregisterAbortController(uploadId);

              let errorMessage = 'Retry request failed';
              try {
                const errorData = await response.json();
                if (errorData.error?.message) {
                  errorMessage = errorData.error.message;
                } else if (errorData.message) {
                  errorMessage = errorData.message;
                }
              } catch {
                errorMessage = `Retry failed with status ${response.status}`;
              }

              // Mark retried files as failed
              for (const originalIndex of indexMapping) {
                dispatch(
                  setFileError({
                    index: originalIndex,
                    name: stateFiles[originalIndex].name,
                    message: errorMessage,
                  })
                );
              }

              return {
                error: {
                  name: 'UnknownError',
                  message: errorMessage,
                  status: response.status,
                },
              };
            }

            const streamResult = await processSSEStream({
              response,
              dispatch,
              indexMapper: (serverIndex) => indexMapping[serverIndex],
            });

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
                error: { name: 'UnknownError', message: 'Retry cancelled' },
              };
            }

            const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
            return {
              error: {
                name: 'UnknownError',
                message: errorMessage,
              },
            };
          }
        },
        invalidatesTags: [{ type: 'Asset', id: 'LIST' }],
      }),
    }),
  });

export const { useUploadFilesStreamMutation, useRetryCancelledFilesStreamMutation } = uploadApi;
export { uploadApi };
