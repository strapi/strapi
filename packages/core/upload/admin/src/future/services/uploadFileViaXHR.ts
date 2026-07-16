import type { File } from '../../../../shared/contracts/files';

/**
 * Thrown when an upload is aborted via its `AbortSignal`.
 * Distinct from {@link UploadFileError} so callers can tell cancellation apart
 * from a genuine failure.
 */
export class UploadAbortedError extends Error {
  constructor(message = 'Upload aborted') {
    super(message);
    this.name = 'UploadAbortedError';
  }
}

/**
 * Thrown when an upload fails (non-2xx response, network error, or unparseable body).
 */
export class UploadFileError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'UploadFileError';
    this.status = status;
  }
}

export type UploadProgressCallback = (bytes: number, total: number) => void;

/**
 * Uploads a single file via `XMLHttpRequest`, exposing real byte-level upload
 * progress through {@link XMLHttpRequest.upload}'s `progress` event.
 *
 * This is the only place raw XHR lives. `fetch()` is intentionally avoided here
 * because it does not surface upload progress.
 *
 * @param url - The full endpoint URL to POST to.
 * @param token - Admin auth token; the `Authorization` header is only set when present.
 * @param formData - Prebuilt multipart body containing the single file and its `fileInfo`.
 * @param signal - Aborts the in-flight request when triggered.
 * @param onProgress - Called with `(loaded, total)` bytes as the upload progresses.
 * @returns The parsed response body on a 2xx response — a signed `File` by default,
 * or `T` when the endpoint returns a different shape (e.g. an array of files).
 * @throws {UploadAbortedError} When the signal aborts.
 * @throws {UploadFileError} On a non-2xx response or network error.
 */
export const uploadFileViaXHR = <T = File>(
  url: string,
  token: string | null | undefined,
  formData: FormData,
  signal: AbortSignal,
  onProgress?: UploadProgressCallback
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(new UploadAbortedError());
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    const handleAbort = () => xhr.abort();
    signal.addEventListener('abort', handleAbort);

    const cleanup = () => signal.removeEventListener('abort', handleAbort);

    if (onProgress) {
      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total);
        }
      };
    }

    xhr.onload = () => {
      cleanup();

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          reject(new UploadFileError('Failed to parse upload response'));
        }
        return;
      }

      let message = `Upload failed with status ${xhr.status}`;
      try {
        const parsed = JSON.parse(xhr.responseText);
        message = parsed?.error?.message || parsed?.message || message;
      } catch {
        // Keep the default status-based message.
      }
      reject(new UploadFileError(message, xhr.status));
    };

    xhr.onerror = () => {
      cleanup();
      reject(new UploadFileError('Network error occurred'));
    };

    xhr.onabort = () => {
      cleanup();
      reject(new UploadAbortedError());
    };

    xhr.send(formData);
  });
};
