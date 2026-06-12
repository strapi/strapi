import {
  uploadProgressReducer,
  openUploadProgress,
  setFileUploading,
  setFileProgress,
  setFileComplete,
  setFileError,
  cancelUpload,
  setUploadFailed,
  retryCancelledFiles,
  selectAggregateProgress,
  type FileProgress,
  type FileProgressStatus,
  type UploadProgressState,
} from '../uploadProgress';

const makeFile = (
  index: number,
  status: FileProgressStatus,
  size: number,
  uploadedBytes = 0
): FileProgress => ({
  name: `file-${index}.png`,
  index,
  status,
  size,
  uploadedBytes,
});

const makeState = (files: FileProgress[]): UploadProgressState => ({
  isVisible: true,
  isMinimized: false,
  totalFiles: files.length,
  files,
  errors: [],
  uploadId: 1,
});

const aggregate = (state: UploadProgressState) =>
  selectAggregateProgress({ uploadProgress: state });

describe('uploadProgress slice', () => {
  describe('openUploadProgress', () => {
    it('creates pending files with zero uploadedBytes and increments uploadId', () => {
      const next = uploadProgressReducer(
        undefined,
        openUploadProgress({ totalFiles: 2, fileNames: ['a.png', 'b.png'], fileSizes: [10, 20] })
      );

      expect(next.isVisible).toBe(true);
      expect(next.uploadId).toBe(1);
      expect(next.files).toEqual([
        { name: 'a.png', index: 0, status: 'pending', size: 10, uploadedBytes: 0 },
        { name: 'b.png', index: 1, status: 'pending', size: 20, uploadedBytes: 0 },
      ]);
    });
  });

  describe('setFileProgress', () => {
    it('updates only the targeted file and clamps to size', () => {
      const state = makeState([makeFile(0, 'uploading', 100), makeFile(1, 'pending', 100)]);

      const updated = uploadProgressReducer(state, setFileProgress({ index: 0, bytes: 40 }));
      expect(updated.files[0].uploadedBytes).toBe(40);
      expect(updated.files[1].uploadedBytes).toBe(0);

      const clamped = uploadProgressReducer(updated, setFileProgress({ index: 0, bytes: 999 }));
      expect(clamped.files[0].uploadedBytes).toBe(100);
    });
  });

  describe('setFileComplete', () => {
    it('marks the file complete and fills uploadedBytes to its size', () => {
      const state = makeState([makeFile(0, 'uploading', 100, 30)]);

      const next = uploadProgressReducer(
        state,
        setFileComplete({ index: 0, file: { id: 5, name: 'a.png', hash: 'h' } as never })
      );

      expect(next.files[0].status).toBe('complete');
      expect(next.files[0].uploadedBytes).toBe(100);
      expect(next.files[0].file).toMatchObject({ id: 5 });
    });
  });

  describe('setFileError', () => {
    it('marks the file errored and records the error', () => {
      const state = makeState([makeFile(0, 'uploading', 100, 30)]);

      const next = uploadProgressReducer(
        state,
        setFileError({ index: 0, name: 'a.png', message: 'boom' })
      );

      expect(next.files[0].status).toBe('error');
      expect(next.files[0].error).toBe('boom');
      expect(next.errors).toEqual([{ name: 'a.png', message: 'boom' }]);
    });
  });

  describe('setUploadFailed', () => {
    it('marks pending and uploading files as errored, leaving terminal files untouched', () => {
      const state = makeState([
        makeFile(0, 'complete', 100, 100),
        makeFile(1, 'uploading', 100, 50),
        makeFile(2, 'pending', 100),
      ]);

      const next = uploadProgressReducer(state, setUploadFailed({ message: 'network down' }));

      expect(next.files.map((f) => f.status)).toEqual(['complete', 'error', 'error']);
      expect(next.files[1].error).toBe('network down');
      expect(next.errors).toContainEqual({ name: 'Upload Error', message: 'network down' });
    });
  });

  describe('cancelUpload', () => {
    it('cancels only pending and uploading files', () => {
      const state = makeState([
        makeFile(0, 'complete', 100, 100),
        makeFile(1, 'error', 100),
        makeFile(2, 'uploading', 100, 20),
        makeFile(3, 'pending', 100),
      ]);

      const next = uploadProgressReducer(state, cancelUpload());

      expect(next.files.map((f) => f.status)).toEqual([
        'complete',
        'error',
        'cancelled',
        'cancelled',
      ]);
    });
  });

  describe('retryCancelledFiles', () => {
    it('resets only cancelled files back to pending and clears their uploadedBytes', () => {
      const state = makeState([
        makeFile(0, 'complete', 100, 100),
        makeFile(1, 'cancelled', 100, 60),
        makeFile(2, 'error', 100),
      ]);

      const next = uploadProgressReducer(state, retryCancelledFiles());

      expect(next.files.map((f) => f.status)).toEqual(['complete', 'pending', 'error']);
      expect(next.files[1].uploadedBytes).toBe(0);
    });
  });

  describe('setFileUploading', () => {
    it('marks the file uploading and records its size', () => {
      const state = makeState([makeFile(0, 'pending', 0)]);

      const next = uploadProgressReducer(
        state,
        setFileUploading({ name: 'a.png', index: 0, size: 500 })
      );

      expect(next.files[0].status).toBe('uploading');
      expect(next.files[0].size).toBe(500);
    });
  });

  describe('selectAggregateProgress', () => {
    it('returns byte-weighted progress across the batch', () => {
      const state = makeState([
        makeFile(0, 'complete', 100, 100),
        makeFile(1, 'uploading', 300, 50),
      ]);

      // (100 + 50) / 400 = 37.5 → 38
      expect(aggregate(state)).toBe(38);
    });

    it('falls back to count-based progress when all sizes are zero', () => {
      const state = makeState([
        makeFile(0, 'complete', 0),
        makeFile(1, 'error', 0),
        makeFile(2, 'uploading', 0),
        makeFile(3, 'pending', 0),
      ]);

      // 2 of 4 files settled → 50%
      expect(aggregate(state)).toBe(50);
    });

    it('returns 0 for an empty batch', () => {
      expect(aggregate(makeState([]))).toBe(0);
    });
  });
});
