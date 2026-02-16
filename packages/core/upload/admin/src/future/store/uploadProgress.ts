import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

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
  file?: File;
  error?: string;
}

export interface UploadProgressState {
  isVisible: boolean;
  isMinimized: boolean;
  progress: number;
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
  progress: 0,
  totalFiles: 0,
  files: [],
  errors: [],
  uploadId: 0,
};

const computeProgress = (files: FileProgress[]): number => {
  if (files.length === 0) return 0;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize === 0) {
    // Fallback to count-based if sizes are unknown
    const completed = files.filter(
      (f) => f.status === 'complete' || f.status === 'error' || f.status === 'cancelled'
    ).length;
    return Math.round((completed / files.length) * 100);
  }
  const completedSize = files
    .filter((f) => f.status === 'complete' || f.status === 'error' || f.status === 'cancelled')
    .reduce((sum, f) => sum + f.size, 0);
  return Math.round((completedSize / totalSize) * 100);
};

const uploadProgressSlice = createSlice({
  name: 'uploadProgress',
  initialState,
  reducers: {
    openUploadProgress(
      state,
      action: PayloadAction<{ totalFiles: number; fileNames: string[]; fileSizes: number[] }>
    ) {
      state.isVisible = true;
      state.isMinimized = false;
      state.progress = 0;
      state.totalFiles = action.payload.totalFiles;
      state.files = action.payload.fileNames.map((name, index) => ({
        name,
        index,
        status: 'pending' as FileProgressStatus,
        size: action.payload.fileSizes[index] || 0,
      }));
      state.errors = [];
      state.uploadId += 1;
    },
    setFileUploading(
      state,
      action: PayloadAction<{ name: string; index: number; total: number; size: number }>
    ) {
      const { index } = action.payload;
      if (state.files[index]) {
        state.files[index].status = 'uploading';
      }
    },
    setFileComplete(state, action: PayloadAction<{ index: number; file: File }>) {
      const { index, file } = action.payload;
      if (state.files[index]) {
        state.files[index].status = 'complete';
        state.files[index].file = file;
      }
      state.progress = computeProgress(state.files);
    },
    setFileError(state, action: PayloadAction<{ index: number; name: string; message: string }>) {
      const { index, name, message } = action.payload;
      if (state.files[index]) {
        state.files[index].status = 'error';
        state.files[index].error = message;
      }
      state.errors = [...state.errors, { name, message }];
      state.progress = computeProgress(state.files);
    },
    updateProgress(state, action: PayloadAction<number>) {
      state.progress = action.payload;
    },
    addUploadErrors(state, action: PayloadAction<FileUploadError[]>) {
      state.errors = [...state.errors, ...action.payload];
    },
    closeUploadProgress(state) {
      state.isVisible = false;
      state.isMinimized = false;
      state.progress = 0;
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
      state.progress = computeProgress(state.files);
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
      state.progress = 100;
      state.errors = [...state.errors, { name: 'Upload Error', message: action.payload.message }];
    },
    retryCancelledFiles(state) {
      // Reset all cancelled files back to pending for retry
      state.files = state.files.map((file) => {
        if (file.status === 'cancelled') {
          return {
            ...file,
            status: 'pending' as FileProgressStatus,
          };
        }
        return file;
      });
      state.progress = computeProgress(state.files);
    },
  },
});

export const {
  openUploadProgress,
  setFileUploading,
  setFileComplete,
  setFileError,
  updateProgress,
  addUploadErrors,
  closeUploadProgress,
  toggleMinimize,
  cancelUpload,
  setUploadFailed,
  retryCancelledFiles,
} = uploadProgressSlice.actions;

export const uploadProgressReducer = uploadProgressSlice.reducer;
