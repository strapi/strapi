import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { File } from '../../../../shared/contracts/files';

export interface FileUploadError {
  name: string;
  message: string;
}

export type FileProgressStatus = 'pending' | 'uploading' | 'complete' | 'error' | 'cancelled';

export interface FileProgress {
  name: string;
  index: number;
  status: FileProgressStatus;
  size: number;
  uploadedBytes: number;
  file?: File;
  error?: string;
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

export const {
  openUploadProgress,
  setFileUploading,
  setFileProgress,
  setFileComplete,
  setFileError,
  addUploadErrors,
  closeUploadProgress,
  toggleMinimize,
  cancelUpload,
  setUploadFailed,
  retryCancelledFiles,
} = uploadProgressSlice.actions;

export const uploadProgressReducer = uploadProgressSlice.reducer;
