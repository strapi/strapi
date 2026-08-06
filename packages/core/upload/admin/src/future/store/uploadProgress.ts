import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { File } from '../../../../shared/contracts/files';

export interface FileUploadError {
  name: string;
  message: string;
}

export type FileProgressStatus = 'pending' | 'uploading' | 'complete' | 'error' | 'cancelled';

/**
 * AI metadata generation phase for a single row, tracked independently from the
 * upload status: a metadata failure never turns a successful upload into an error.
 * `undefined` means the row has no metadata phase at all, i.e. AI metadata is
 * disabled — non-images do get a phase and come back `skipped` from the server.
 */
export type FileMetadataStatus = 'generating' | 'generated' | 'skipped' | 'failed';

export type FileMetadataResultStatus = Exclude<FileMetadataStatus, 'generating'>;

export interface FileProgress {
  name: string;
  index: number;
  status: FileProgressStatus;
  size: number;
  uploadedBytes: number;
  file?: File;
  error?: string;
  metadataStatus?: FileMetadataStatus;
}

export interface UploadProgressState {
  isVisible: boolean;
  isMinimized: boolean;
  totalFiles: number;
  files: FileProgress[];
  errors: FileUploadError[];
  uploadId: number;
}

export interface RootState {
  uploadProgress: UploadProgressState;
}

const initialState: UploadProgressState = {
  isVisible: false,
  isMinimized: false,
  totalFiles: 0,
  files: [],
  errors: [],
  uploadId: 0,
};

const uploadProgressSlice = createSlice({
  name: 'uploadProgress',
  initialState,
  reducers: {
    openUploadProgress(
      state,
      action: PayloadAction<{
        totalFiles: number;
        fileNames: string[];
        fileSizes?: number[];
      }>
    ) {
      state.isVisible = true;
      state.isMinimized = false;

      // Create pending files for upload
      const pendingFiles: FileProgress[] = action.payload.fileNames.map((name, index) => ({
        name,
        index,
        status: 'pending' as FileProgressStatus,
        size: action.payload.fileSizes?.[index] ?? 0,
        uploadedBytes: 0,
      }));

      state.files = pendingFiles;
      state.totalFiles = action.payload.totalFiles;
      state.errors = [];
      state.uploadId += 1;
    },
    setFileUploading(state, action: PayloadAction<{ name: string; index: number; size: number }>) {
      const { index, size } = action.payload;
      if (state.files[index]) {
        state.files[index].status = 'uploading';
        state.files[index].size = size;
      }
    },
    setFileProgress(state, action: PayloadAction<{ index: number; bytes: number }>) {
      const { index, bytes } = action.payload;
      const file = state.files[index];
      if (file) {
        // Clamp to the known file size so the aggregate can never exceed 100%.
        file.uploadedBytes = Math.min(bytes, file.size);
      }
    },
    setFileComplete(state, action: PayloadAction<{ index: number; file: File }>) {
      const { index, file } = action.payload;
      if (state.files[index]) {
        state.files[index].status = 'complete';
        state.files[index].file = file;
        // Reflect completion in the aggregate even if the final progress event was throttled.
        state.files[index].uploadedBytes = state.files[index].size;
      }
    },
    setFileError(state, action: PayloadAction<{ index: number; name: string; message: string }>) {
      const { index, name, message } = action.payload;
      if (state.files[index]) {
        state.files[index].status = 'error';
        state.files[index].error = message;
      }
      state.errors = [...state.errors, { name, message }];
    },
    /**
     * Metadata generation started for a row.
     *
     * Metadata requests are fired-and-forgotten, so their callbacks can land after
     * a new batch has replaced `files` and reused the same row indices. Every
     * metadata payload therefore carries the `uploadId` it was fired for, and stale
     * ones are dropped instead of writing onto another batch's row.
     */
    setFileMetadataGenerating(state, action: PayloadAction<{ index: number; uploadId: number }>) {
      const { index, uploadId } = action.payload;
      if (uploadId !== state.uploadId) {
        return;
      }
      if (state.files[index]) {
        state.files[index].metadataStatus = 'generating';
      }
    },
    /**
     * Terminal metadata outcome for a row. Never touches `status`/`error`/`errors`:
     * the upload itself already succeeded regardless of how generation went.
     */
    setFileMetadataResult(
      state,
      action: PayloadAction<{
        index: number;
        uploadId: number;
        status: FileMetadataResultStatus;
      }>
    ) {
      const { index, uploadId, status } = action.payload;
      if (uploadId !== state.uploadId) {
        return;
      }
      if (state.files[index]) {
        state.files[index].metadataStatus = status;
      }
    },
    addUploadErrors(state, action: PayloadAction<FileUploadError[]>) {
      state.errors = [...state.errors, ...action.payload];
    },
    closeUploadProgress(state) {
      state.isVisible = false;
      state.isMinimized = false;
      state.totalFiles = 0;
      state.files = [];
      state.errors = [];
    },
    toggleMinimize(state) {
      state.isMinimized = !state.isMinimized;
    },
    cancelUpload(state) {
      // Mark all pending and uploading files as cancelled
      state.files = state.files.map((file) => {
        if (file.status === 'pending' || file.status === 'uploading') {
          return { ...file, status: 'cancelled' as FileProgressStatus };
        }
        return file;
      });
    },
    setUploadFailed(state, action: PayloadAction<{ message: string }>) {
      // Mark all pending and uploading files as errored when a catastrophic failure occurs
      state.files = state.files.map((file) => {
        if (file.status === 'pending' || file.status === 'uploading') {
          return {
            ...file,
            status: 'error' as FileProgressStatus,
            error: action.payload.message,
          };
        }
        return file;
      });
      state.errors = [...state.errors, { name: 'Upload Error', message: action.payload.message }];
    },
    retryCancelledFiles(state) {
      // Reset all cancelled files back to pending for retry
      state.files = state.files.map((file) => {
        if (file.status === 'cancelled') {
          return {
            ...file,
            status: 'pending' as FileProgressStatus,
            uploadedBytes: 0,
            // A retried row goes through the metadata phase again from scratch.
            metadataStatus: undefined,
          };
        }
        return file;
      });
    },
  },
});

/**
 * Byte-weighted aggregate progress across the whole batch: `sum(uploadedBytes) / sum(size)`.
 *
 * Falls back to count-based progress (settled files / total files) when all sizes are
 * zero — e.g. URL-flow rows where the file size is unknown up front.
 */
export const selectAggregateProgress = createSelector(
  (state: RootState) => state.uploadProgress.files,
  (files): number => {
    if (files.length === 0) return 0;

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    if (totalSize === 0) {
      const settled = files.filter(
        (f) => f.status === 'complete' || f.status === 'error' || f.status === 'cancelled'
      ).length;
      return Math.round((settled / files.length) * 100);
    }

    const uploadedBytes = files.reduce((sum, f) => sum + f.uploadedBytes, 0);
    return Math.round((uploadedBytes / totalSize) * 100);
  }
);

/**
 * Count-based metadata progress across the whole batch: `settled / expected`.
 *
 * Count-based rather than byte-weighted because the generation endpoint answers in one
 * go — there is no intermediate progress to weight.
 *
 * The denominator is every row *expected* to enter the phase, not just those that
 * already have. Generation is fired per file as each upload finishes, so counting only
 * started rows made the denominator grow mid-batch and the percentage jump backwards
 * (1/1 = 100%, then a second row starts and it drops to 1/2 = 50%), which flickered the
 * header subtitle on and off once per file.
 *
 * "Expected" is derived from upload outcome rather than from the AI-metadata flag:
 *  - a row still uploading may yet enter the phase, so it counts toward the total;
 *  - an errored or cancelled row never will, so it must not — otherwise a batch with
 *    one failure could never reach 100%.
 *
 * Returns `null` when nothing has entered the phase and nothing is pending — i.e. AI
 * metadata is off, or the batch is done — so the header can hide the subtitle.
 */
export const selectMetadataProgress = createSelector(
  (state: RootState) => state.uploadProgress.files,
  (files): number | null => {
    const started = files.filter((f) => f.metadataStatus !== undefined);

    // Nothing has entered the phase yet: with no started row there is no evidence AI
    // metadata is even enabled, so stay silent rather than showing a premature 0%.
    if (started.length === 0) return null;

    // Rows whose upload is still in flight are counted in the denominator so the
    // percentage only ever climbs as the batch progresses.
    const pending = files.filter(
      (f) => f.metadataStatus === undefined && (f.status === 'pending' || f.status === 'uploading')
    ).length;

    const expected = started.length + pending;
    const settled = started.filter((f) => f.metadataStatus !== 'generating').length;

    return Math.round((settled / expected) * 100);
  }
);

/**
 * Whether the metadata phase is still ongoing for the batch as a whole.
 *
 * The header uses this — not `selectMetadataProgress === 100` — to decide when to drop
 * the subtitle. Two distinct reasons the phase can be unfinished:
 *  - a row is generating right now;
 *  - no row is generating this instant, but rows are still uploading and will enter the
 *    phase when they finish.
 *
 * The second clause is what keeps the subtitle stable. Generation for file N typically
 * finishes before file N+1 finishes uploading, so a naive "is anything generating?"
 * check goes false between every pair of files and blinks the subtitle out and back in.
 */
export const selectIsGeneratingMetadata = createSelector(
  (state: RootState) => state.uploadProgress.files,
  (files): boolean => {
    if (files.some((f) => f.metadataStatus === 'generating')) return true;

    // Only bridge the gap if some row has already entered the phase — otherwise a batch
    // with AI metadata disabled would report the phase as ongoing for its whole upload.
    const hasStarted = files.some((f) => f.metadataStatus !== undefined);

    return hasStarted && files.some((f) => f.status === 'pending' || f.status === 'uploading');
  }
);

/**
 * How many rows reached each terminal metadata outcome, for the header's completion
 * message. `null` while the phase is unfinished — or was never entered at all — so the
 * caller has a single check for "there is no settled outcome to report yet".
 *
 * Counts are reported separately rather than collapsed into one total because they are
 * not interchangeable: only `generated` rows actually had metadata written, so only that
 * count can be claimed as a success. A batch of non-images settles entirely on `skipped`,
 * where "generated on 0 files" would be worse than saying nothing.
 */
export const selectMetadataOutcome = createSelector(
  (state: RootState) => state.uploadProgress.files,
  (files): { generated: number; skipped: number; failed: number } | null => {
    const started = files.filter((f) => f.metadataStatus !== undefined);

    if (started.length === 0) return null;

    // Mirrors `selectIsGeneratingMetadata`: the phase isn't over while a row is
    // generating, nor while a row is still uploading and has yet to enter it.
    const isOngoing =
      started.some((f) => f.metadataStatus === 'generating') ||
      files.some((f) => f.status === 'pending' || f.status === 'uploading');

    if (isOngoing) return null;

    return {
      generated: started.filter((f) => f.metadataStatus === 'generated').length,
      skipped: started.filter((f) => f.metadataStatus === 'skipped').length,
      failed: started.filter((f) => f.metadataStatus === 'failed').length,
    };
  }
);

export const {
  openUploadProgress,
  setFileUploading,
  setFileProgress,
  setFileComplete,
  setFileError,
  setFileMetadataGenerating,
  setFileMetadataResult,
  addUploadErrors,
  closeUploadProgress,
  toggleMinimize,
  cancelUpload,
  setUploadFailed,
  retryCancelledFiles,
} = uploadProgressSlice.actions;

export const uploadProgressReducer = uploadProgressSlice.reducer;
