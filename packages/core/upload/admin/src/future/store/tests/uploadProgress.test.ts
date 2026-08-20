import {
  uploadProgressReducer,
  openUploadProgress,
  setFileUploading,
  setFileProgress,
  setFileComplete,
  setFileError,
  setFileMetadataGenerating,
  setFileMetadataResult,
  cancelUpload,
  setUploadFailed,
  retryCancelledFiles,
  selectAggregateProgress,
  selectMetadataProgress,
  selectIsGeneratingMetadata,
  selectMetadataOutcome,
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

const metadataProgress = (state: UploadProgressState) =>
  selectMetadataProgress({ uploadProgress: state });

const isGenerating = (state: UploadProgressState) =>
  selectIsGeneratingMetadata({ uploadProgress: state });

const metadataOutcome = (state: UploadProgressState) =>
  selectMetadataOutcome({ uploadProgress: state });

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

    it('clears metadataStatus on retried rows so they re-enter the metadata phase', () => {
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'generated' as const },
        { ...makeFile(1, 'cancelled', 100, 60), metadataStatus: 'failed' as const },
      ]);

      const next = uploadProgressReducer(state, retryCancelledFiles());

      // The completed row keeps its outcome; only the retried row is reset.
      expect(next.files[0].metadataStatus).toBe('generated');
      expect(next.files[1].metadataStatus).toBeUndefined();
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

  describe('metadata reducers', () => {
    it('marks a row as generating', () => {
      const state = makeState([makeFile(0, 'complete', 100, 100)]);

      const next = uploadProgressReducer(
        state,
        setFileMetadataGenerating({ index: 0, uploadId: 1 })
      );

      expect(next.files[0].metadataStatus).toBe('generating');
    });

    it.each(['generated', 'skipped', 'failed'] as const)('records the %s outcome', (status) => {
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'generating' as const },
      ]);

      const next = uploadProgressReducer(
        state,
        setFileMetadataResult({ index: 0, uploadId: 1, status })
      );

      expect(next.files[0].metadataStatus).toBe(status);
    });

    it('leaves the upload status and batch errors untouched when generation fails', () => {
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'generating' as const },
      ]);

      const next = uploadProgressReducer(
        state,
        setFileMetadataResult({ index: 0, uploadId: 1, status: 'failed' })
      );

      // The upload itself succeeded — a metadata failure must never demote it.
      expect(next.files[0].status).toBe('complete');
      expect(next.files[0].error).toBeUndefined();
      expect(next.errors).toEqual([]);
    });

    it('ignores a dispatch for an index that does not exist', () => {
      const state = makeState([makeFile(0, 'complete', 100, 100)]);

      const next = uploadProgressReducer(
        state,
        setFileMetadataResult({ index: 5, uploadId: 1, status: 'generated' })
      );

      expect(next.files).toHaveLength(1);
      expect(next.files[0].metadataStatus).toBeUndefined();
    });

    describe('stale-batch guard', () => {
      it('drops a generating dispatch carrying a previous uploadId', () => {
        // uploadId 1 = current batch; the callback belongs to the batch before it.
        const state = makeState([makeFile(0, 'complete', 100, 100)]);

        const next = uploadProgressReducer(
          state,
          setFileMetadataGenerating({ index: 0, uploadId: 0 })
        );

        expect(next.files[0].metadataStatus).toBeUndefined();
      });

      it('drops a result dispatch carrying a previous uploadId', () => {
        const state = makeState([makeFile(0, 'complete', 100, 100)]);

        const next = uploadProgressReducer(
          state,
          setFileMetadataResult({ index: 0, uploadId: 0, status: 'failed' })
        );

        expect(next.files[0].metadataStatus).toBeUndefined();
      });

      it('does not overwrite the new batch row when a late callback reuses its index', () => {
        // A new batch opened (uploadId bumps to 2) and reused index 0 while the old
        // batch's metadata request was still in flight.
        const opened = uploadProgressReducer(
          makeState([makeFile(0, 'complete', 100, 100)]),
          openUploadProgress({ totalFiles: 1, fileNames: ['new.png'], fileSizes: [10] })
        );
        expect(opened.uploadId).toBe(2);

        const next = uploadProgressReducer(
          opened,
          setFileMetadataResult({ index: 0, uploadId: 1, status: 'generated' })
        );

        expect(next.files[0].name).toBe('new.png');
        expect(next.files[0].metadataStatus).toBeUndefined();
        expect(next.files[0].status).toBe('pending');
      });
    });
  });

  describe('selectMetadataProgress', () => {
    it('returns null when no row entered the metadata phase', () => {
      const state = makeState([
        makeFile(0, 'complete', 100, 100),
        makeFile(1, 'complete', 100, 100),
      ]);

      expect(metadataProgress(state)).toBeNull();
    });

    it('counts settled rows over the rows with a metadata phase only', () => {
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'generated' as const },
        { ...makeFile(1, 'complete', 100, 100), metadataStatus: 'failed' as const },
        { ...makeFile(2, 'complete', 100, 100), metadataStatus: 'generating' as const },
        // Settled upload that never entered the phase: excluded from both sides.
        makeFile(3, 'complete', 100, 100),
      ]);

      // 2 of 3 rows settled → 67%
      expect(metadataProgress(state)).toBe(67);
    });

    it('counts still-uploading rows in the denominator so the percentage never regresses', () => {
      // Generation is fired per file as uploads finish, so a batch is normally observed
      // mid-flight: one row settled, the rest not yet started. Counting only started
      // rows would report 100% here and then drop back as each later row begins.
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'generated' as const },
        makeFile(1, 'uploading', 100, 20),
        makeFile(2, 'pending', 100),
      ]);

      // 1 settled of 3 expected → 33%, not 1-of-1 = 100%.
      expect(metadataProgress(state)).toBe(33);
    });

    it('excludes errored and cancelled rows from the denominator', () => {
      // Those rows never enter the phase, so counting them would strand the batch
      // below 100% forever.
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'generated' as const },
        makeFile(1, 'error', 100),
        makeFile(2, 'cancelled', 100),
      ]);

      expect(metadataProgress(state)).toBe(100);
    });

    it('counts skipped rows as settled', () => {
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'skipped' as const },
        { ...makeFile(1, 'complete', 100, 100), metadataStatus: 'generating' as const },
      ]);

      expect(metadataProgress(state)).toBe(50);
    });

    it('returns 100 once every metadata row is terminal', () => {
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'generated' as const },
        { ...makeFile(1, 'complete', 100, 100), metadataStatus: 'skipped' as const },
      ]);

      expect(metadataProgress(state)).toBe(100);
    });
  });

  describe('selectIsGeneratingMetadata', () => {
    it('is true while a row is generating', () => {
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'generating' as const },
      ]);

      expect(isGenerating(state)).toBe(true);
    });

    it('bridges the gap between files while later rows are still uploading', () => {
      // The flicker this guards against: generation for file 0 finished before file 1
      // finished uploading, so nothing is generating at this instant — but the phase is
      // not over, and the header subtitle must not blink out.
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'generated' as const },
        makeFile(1, 'uploading', 100, 40),
      ]);

      expect(isGenerating(state)).toBe(true);
    });

    it('is false once the batch is fully settled', () => {
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'generated' as const },
        { ...makeFile(1, 'complete', 100, 100), metadataStatus: 'skipped' as const },
      ]);

      expect(isGenerating(state)).toBe(false);
    });

    it('stays false for an in-flight batch with AI metadata disabled', () => {
      // No row ever enters the phase, so the pending-upload clause must not fire.
      const state = makeState([
        makeFile(0, 'complete', 100, 100),
        makeFile(1, 'uploading', 100, 40),
      ]);

      expect(isGenerating(state)).toBe(false);
    });
  });

  describe('selectMetadataOutcome', () => {
    it('returns null when no row entered the metadata phase', () => {
      const state = makeState([
        makeFile(0, 'complete', 100, 100),
        makeFile(1, 'complete', 100, 100),
      ]);

      expect(metadataOutcome(state)).toBeNull();
    });

    it('returns null while a row is still generating', () => {
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'generated' as const },
        { ...makeFile(1, 'complete', 100, 100), metadataStatus: 'generating' as const },
      ]);

      expect(metadataOutcome(state)).toBeNull();
    });

    it('returns null while rows are still uploading and have yet to enter the phase', () => {
      // Same gap-bridging as `selectIsGeneratingMetadata`: reporting a final count here
      // would announce a total that is about to grow.
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'generated' as const },
        makeFile(1, 'uploading', 100, 40),
      ]);

      expect(metadataOutcome(state)).toBeNull();
    });

    it('breaks the settled batch down per outcome', () => {
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'generated' as const },
        { ...makeFile(1, 'complete', 100, 100), metadataStatus: 'generated' as const },
        { ...makeFile(2, 'complete', 100, 100), metadataStatus: 'skipped' as const },
        { ...makeFile(3, 'complete', 100, 100), metadataStatus: 'failed' as const },
      ]);

      expect(metadataOutcome(state)).toStrictEqual({ generated: 2, skipped: 1, failed: 1 });
    });

    it('reports zero generated for an all-skipped batch', () => {
      // The header uses this to stay silent rather than claim success on 0 files.
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'skipped' as const },
      ]);

      expect(metadataOutcome(state)).toStrictEqual({ generated: 0, skipped: 1, failed: 0 });
    });

    it('settles even when some rows errored or were cancelled', () => {
      // Those rows never enter the phase, so they must not hold the outcome open.
      const state = makeState([
        { ...makeFile(0, 'complete', 100, 100), metadataStatus: 'generated' as const },
        makeFile(1, 'error', 100),
        makeFile(2, 'cancelled', 100),
      ]);

      expect(metadataOutcome(state)).toStrictEqual({ generated: 1, skipped: 0, failed: 0 });
    });
  });

  describe('metadata phase over a whole sequential batch', () => {
    it('reports one continuous, monotonically climbing phase', () => {
      // End-to-end guard for the original bug: the subtitle appeared and disappeared on
      // every file, and the percentage jumped backwards each time a new row started.
      let state = uploadProgressReducer(
        undefined,
        openUploadProgress({ totalFiles: 3, fileNames: ['a', 'b', 'c'], fileSizes: [10, 10, 10] })
      );

      const observed: Array<{ pct: number | null; visible: boolean }> = [];
      const observe = () => {
        const pct = metadataProgress(state);
        observed.push({ pct, visible: pct !== null && isGenerating(state) });
      };

      for (let index = 0; index < 3; index += 1) {
        state = uploadProgressReducer(state, setFileUploading({ name: 'x', index, size: 10 }));
        state = uploadProgressReducer(
          state,
          setFileComplete({ index, file: { id: index } as never })
        );
        state = uploadProgressReducer(state, setFileMetadataGenerating({ index, uploadId: 1 }));
        observe();
        state = uploadProgressReducer(
          state,
          setFileMetadataResult({ index, uploadId: 1, status: 'generated' })
        );
        observe();
      }

      const percentages = observed.map((o) => o.pct as number);
      expect(percentages).toStrictEqual([0, 33, 33, 67, 67, 100]);

      // Visible throughout, hidden only on the final settle — exactly one transition.
      expect(observed.map((o) => o.visible)).toStrictEqual([true, true, true, true, true, false]);

      // The in-flight subtitle doesn't just vanish at that transition: the terminal
      // outcome becomes available in the same step, so the header swaps one line for the
      // other rather than losing the message.
      expect(metadataOutcome(state)).toStrictEqual({ generated: 3, skipped: 0, failed: 0 });
    });

    it('has no settled outcome to report until the final row lands', () => {
      // Guards the ordering the header depends on: the outcome must stay null for every
      // intermediate step, or a partial count would flash before the batch is done.
      let state = uploadProgressReducer(
        undefined,
        openUploadProgress({ totalFiles: 2, fileNames: ['a', 'b'], fileSizes: [10, 10] })
      );

      const outcomes: Array<ReturnType<typeof metadataOutcome>> = [];

      for (let index = 0; index < 2; index += 1) {
        state = uploadProgressReducer(state, setFileUploading({ name: 'x', index, size: 10 }));
        state = uploadProgressReducer(
          state,
          setFileComplete({ index, file: { id: index } as never })
        );
        state = uploadProgressReducer(state, setFileMetadataGenerating({ index, uploadId: 1 }));
        outcomes.push(metadataOutcome(state));
        state = uploadProgressReducer(
          state,
          setFileMetadataResult({ index, uploadId: 1, status: 'generated' })
        );
        outcomes.push(metadataOutcome(state));
      }

      expect(outcomes.slice(0, -1).every((o) => o === null)).toBe(true);
      expect(outcomes.at(-1)).toStrictEqual({ generated: 2, skipped: 0, failed: 0 });
    });
  });
});
