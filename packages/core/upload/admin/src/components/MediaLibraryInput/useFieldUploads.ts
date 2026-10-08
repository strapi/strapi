import { useCallback, useEffect, useRef, useState } from 'react';

import { shallowEqual } from 'react-redux';

import {
  abortUploadFile,
  getUploadSourceFile,
  useRetryUploadFileMutation,
} from '../../services/api';
import { useTypedDispatch, useTypedSelector } from '../../store/hooks';
import { cancelFile, type FileProgress } from '../../store/uploadProgress';

import type { File } from '../../../../shared/contracts/files';

export interface FieldUpload {
  key: string;
  uploadId: number;
  index: number;
  name: string;
  status: 'uploading' | 'failed';
  /** 0–100, or `null` while the size is unknown. */
  progress: number | null;
  /** The file the user picked, for the preview. Gone once the page reloads. */
  sourceFile?: globalThis.File;
  /** Whether the progress store still holds the row, i.e. it can be retried in place. */
  isInStore: boolean;
}

interface TrackedRow {
  uploadId: number;
  row: FileProgress;
}

const NO_ROWS: FileProgress[] = [];

const getKey = (uploadId: number, index: number) => `${uploadId}:${index}`;

const toProgress = ({ status, size, uploadedBytes }: FileProgress) => {
  if (status === 'pending') {
    return 0;
  }

  return size > 0 ? Math.round((uploadedBytes / size) * 100) : null;
};

/**
 * The uploads a field started, read from the shared progress store so the field
 * and the progress dialog always agree.
 *
 * The store only holds the latest batch, and closing the dialog empties it. Rows
 * are therefore remembered here once seen: a failed upload stays on the field
 * until the user retries or removes it, whatever happened to the dialog. A row
 * that vanished while still in flight was cancelled along with its batch.
 *
 * Completed rows are handed to `onComplete` once each, then leave the list —
 * from there on they are ordinary assets of the field.
 */
export const useFieldUploads = (owner: string, onComplete: (assets: File[]) => void) => {
  const dispatch = useTypedDispatch();
  const [retryUploadFile] = useRetryUploadFileMutation();

  // The plugin registers the slice in `register()`; a host that has not has no
  // uploads to show.
  const currentUploadId = useTypedSelector((state) => state.uploadProgress?.uploadId ?? 0);
  const ownedRows = useTypedSelector(
    (state) => (state.uploadProgress?.files ?? NO_ROWS).filter((file) => file.owner === owner),
    shallowEqual
  );

  const trackedRef = useRef(new Map<string, TrackedRow>());
  const attachedRef = useRef(new Set<string>());
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const tracked = trackedRef.current;
  const liveKeys = new Set<string>();

  ownedRows.forEach((row) => {
    const key = getKey(currentUploadId, row.index);
    liveKeys.add(key);
    tracked.set(key, { uploadId: currentUploadId, row });
  });

  tracked.forEach((entry, key) => {
    const isInFlight = entry.row.status === 'pending' || entry.row.status === 'uploading';

    if (!liveKeys.has(key) && isInFlight) {
      tracked.set(key, { ...entry, row: { ...entry.row, status: 'cancelled' } });
    }
  });

  useEffect(() => {
    const completed: File[] = [];

    ownedRows.forEach((row) => {
      const key = getKey(currentUploadId, row.index);

      if (row.status === 'complete' && row.file && !attachedRef.current.has(key)) {
        attachedRef.current.add(key);
        completed.push(row.file);
      }
    });

    if (completed.length > 0) {
      onCompleteRef.current(completed);
    }
  }, [ownedRows, currentUploadId]);

  const uploads: FieldUpload[] = [];

  tracked.forEach(({ uploadId, row }, key) => {
    const isInFlight = row.status === 'pending' || row.status === 'uploading';
    const isFailed = row.status === 'error' && !dismissed.has(key);

    if (!isInFlight && !isFailed) {
      return;
    }

    uploads.push({
      key,
      uploadId,
      index: row.index,
      name: row.name,
      status: isInFlight ? 'uploading' : 'failed',
      progress: isInFlight ? toProgress(row) : null,
      sourceFile: getUploadSourceFile(uploadId, row.index),
      isInStore: liveKeys.has(key),
    });
  });

  const dismiss = useCallback((key: string) => {
    setDismissed((previous) => new Set(previous).add(key));
  }, []);

  const cancel = useCallback(
    ({ uploadId, index }: FieldUpload) => {
      abortUploadFile(uploadId, index);
      dispatch(cancelFile({ uploadId, index }));
    },
    [dispatch]
  );

  /**
   * Retries in place while the row is still in the store. Once the store has
   * moved on to another batch, the row can only be replayed as a new upload,
   * which `reupload` does with the file the user picked.
   */
  const retry = useCallback(
    async (upload: FieldUpload, reupload: (file: globalThis.File) => void) => {
      if (upload.isInStore) {
        try {
          await retryUploadFile({ uploadId: upload.uploadId, index: upload.index }).unwrap();
        } catch {
          // The row reports the failure itself.
        }
        return;
      }

      if (upload.sourceFile) {
        dismiss(upload.key);
        reupload(upload.sourceFile);
      }
    },
    [dismiss, retryUploadFile]
  );

  return { uploads, cancel, retry, dismiss };
};
