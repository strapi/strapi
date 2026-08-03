import { render, screen, fireEvent, waitFor } from '@tests/utils';

import { UploadProgressDialog } from '../UploadProgressDialog';

import type { FileProgress, UploadProgressState } from '../../store/uploadProgress';

const mockDispatch = jest.fn();
const mockRetryCancelledFiles = jest.fn().mockReturnValue({ unwrap: jest.fn() });

jest.mock('../../store/hooks', () => ({
  useTypedDispatch: () => mockDispatch,
  useTypedSelector: jest.fn(),
}));

jest.mock('../../services/api', () => ({
  abortUpload: jest.fn(),
  useRetryCancelledFilesMutation: () => [mockRetryCancelledFiles],
}));

// Mocked because the api module above is fully mocked — the real settings
// service would call `uploadApi.injectEndpoints` on the mock's undefined.
jest.mock('../../services/settings', () => ({
  useGetUploadSettingsQuery: () => ({ data: { data: { concurrentUploadRequests: 1 } } }),
}));

const { useTypedSelector } = jest.requireMock('../../store/hooks');
const { abortUpload } = jest.requireMock('../../services/api');

const createMockFile = (
  index: number,
  name: string,
  status: FileProgress['status'],
  error?: string
): FileProgress => ({
  name,
  index,
  status,
  size: 1024,
  // Completed files have fully transferred; this drives the byte-weighted aggregate.
  uploadedBytes: status === 'complete' ? 1024 : 0,
  error,
});

const createMockState = (overrides: Partial<UploadProgressState> = {}): UploadProgressState => ({
  isVisible: true,
  isMinimized: false,
  totalFiles: 3,
  files: [],
  errors: [],
  uploadId: 1,
  ...overrides,
});

const setup = (state: UploadProgressState = createMockState()) => {
  useTypedSelector.mockImplementation(
    (selector: (state: { uploadProgress: UploadProgressState }) => unknown) =>
      selector({ uploadProgress: state })
  );
  return render(<UploadProgressDialog />);
};

describe('UploadProgressDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dialog visibility', () => {
    it('renders the dialog when isVisible is true', () => {
      setup(createMockState({ isVisible: true }));
      expect(screen.getByRole('dialog', { name: /upload/i })).toBeInTheDocument();
    });

    it('does not render the dialog when isVisible is false', () => {
      setup(createMockState({ isVisible: false }));
      expect(screen.queryByRole('dialog', { name: /upload/i })).not.toBeInTheDocument();
    });
  });

  describe('HeaderStatus - uploading state', () => {
    it('displays uploading status with progress percentage', () => {
      setup(
        createMockState({
          totalFiles: 4,
          files: [
            createMockFile(0, 'file1.png', 'complete'),
            createMockFile(1, 'file2.png', 'complete'),
            createMockFile(2, 'file3.png', 'uploading'),
            createMockFile(3, 'file4.png', 'pending'),
          ],
        })
      );
      expect(screen.getByText(/Uploading 4 items \(50%\)/)).toBeInTheDocument();
    });

    it('shows Cancel all button during upload', () => {
      setup(
        createMockState({
          files: [
            createMockFile(0, 'file1.png', 'uploading'),
            createMockFile(1, 'file2.png', 'pending'),
          ],
        })
      );
      expect(screen.getByRole('button', { name: 'Cancel all' })).toBeInTheDocument();
    });

    it('calls abortUpload and dispatch cancelUpload when Cancel all is clicked', () => {
      setup(
        createMockState({
          uploadId: 5,
          files: [createMockFile(0, 'file1.png', 'uploading')],
        })
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancel all' }));

      expect(abortUpload).toHaveBeenCalledWith(5);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'uploadProgress/cancelUpload' });
    });
  });

  describe('HeaderStatus - success state', () => {
    it('displays success status when all files are uploaded', async () => {
      setup(
        createMockState({
          totalFiles: 2,
          files: [
            createMockFile(0, 'file1.png', 'complete'),
            createMockFile(1, 'file2.png', 'complete'),
          ],
        })
      );
      await waitFor(() => {
        expect(screen.getByText('Upload successful!')).toBeInTheDocument();
      });
      expect(screen.getByText('2 files uploaded successfully')).toBeInTheDocument();
    });

    it('shows Close button when upload is complete', async () => {
      setup(
        createMockState({
          files: [createMockFile(0, 'file1.png', 'complete')],
        })
      );
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
      });
    });

    it('dispatches closeUploadProgress when Close is clicked', async () => {
      setup(
        createMockState({
          files: [createMockFile(0, 'file1.png', 'complete')],
        })
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'uploadProgress/closeUploadProgress' });
    });
  });

  describe('HeaderStatus - error state', () => {
    it('displays error status when all files have errors', async () => {
      setup(
        createMockState({
          files: [
            createMockFile(0, 'file1.png', 'error', 'File too large'),
            createMockFile(1, 'file2.png', 'error', 'Network error'),
          ],
        })
      );
      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
      expect(screen.getByText('Please try to upload files again')).toBeInTheDocument();
    });
  });

  describe('HeaderStatus - canceled state', () => {
    it('displays canceled status when some files are cancelled', () => {
      setup(
        createMockState({
          files: [
            createMockFile(0, 'file1.png', 'complete'),
            createMockFile(1, 'file2.png', 'cancelled'),
          ],
        })
      );
      expect(screen.getByText('Upload canceled')).toBeInTheDocument();
      expect(screen.getByText('Some files were not uploaded')).toBeInTheDocument();
    });

    it('shows Retry button when there are cancelled files', () => {
      setup(
        createMockState({
          files: [
            createMockFile(0, 'file1.png', 'complete'),
            createMockFile(1, 'file2.png', 'cancelled'),
          ],
        })
      );
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    it('calls retryCancelledFiles when Retry is clicked', async () => {
      mockRetryCancelledFiles.mockReturnValue({ unwrap: jest.fn().mockResolvedValue({}) });

      setup(
        createMockState({
          files: [createMockFile(0, 'file1.png', 'cancelled')],
        })
      );

      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

      expect(mockRetryCancelledFiles).toHaveBeenCalled();
    });
  });

  describe('Minimize/Maximize functionality', () => {
    it('shows Minimize button when not minimized', () => {
      setup(createMockState({ isMinimized: false }));
      expect(screen.getByRole('button', { name: 'Minimize' })).toBeInTheDocument();
    });

    it('shows Maximize button when minimized', () => {
      setup(createMockState({ isMinimized: true }));
      expect(screen.getByRole('button', { name: 'Maximize' })).toBeInTheDocument();
    });

    it('dispatches toggleMinimize when minimize button is clicked', () => {
      setup(createMockState({ isMinimized: false }));

      fireEvent.click(screen.getByRole('button', { name: 'Minimize' }));

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'uploadProgress/toggleMinimize' });
    });
  });

  describe('FileRowRenderer - uploading file', () => {
    it('displays currently uploading file with uploading indicator', () => {
      setup(
        createMockState({
          files: [createMockFile(0, 'uploading-file.png', 'uploading')],
        })
      );
      expect(screen.getByText('uploading-file.png')).toBeInTheDocument();
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });

    it('reports byte progress on a determinate bar once bytes are flowing', () => {
      setup(
        createMockState({
          files: [
            {
              ...createMockFile(0, 'uploading-file.png', 'uploading'),
              size: 1000,
              uploadedBytes: 250,
            },
          ],
        })
      );

      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
    });

    it('falls back to an indeterminate bar while the size is still unknown', () => {
      // The URL flow opens rows at size 0 during the server-side fetch; a determinate
      // bar would sit at 0% for the whole phase and read as stalled.
      setup(
        createMockState({
          files: [
            {
              ...createMockFile(0, 'https://example.com/photo.png', 'uploading'),
              size: 0,
              uploadedBytes: 0,
            },
          ],
        })
      );

      expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
    });

    it('stays indeterminate when the size is known but no bytes are reported', () => {
      // The URL flow's `file:uploading` event carries the real size, but the server
      // sends no incremental byte counts — the next event is `file:complete`. Keying the
      // bar off `size` alone froze these rows at a determinate 0% for the whole upload
      // (observed on a 512MB URL import that took ~10s).
      setup(
        createMockState({
          files: [
            {
              ...createMockFile(0, '512MB.zip', 'uploading'),
              size: 536870912,
              uploadedBytes: 0,
            },
          ],
        })
      );

      expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
    });
  });

  describe('FileRowRenderer - completed file', () => {
    it('displays completed files with uploaded indicator', async () => {
      setup(
        createMockState({
          files: [createMockFile(0, 'completed-file.png', 'complete')],
        })
      );
      await waitFor(() => {
        expect(screen.getByText('completed-file.png')).toBeInTheDocument();
      });
      expect(screen.getByText('Uploaded')).toBeInTheDocument();
    });
  });

  describe('FileRowRenderer - metadata phase', () => {
    const completedWithMetadata = (metadataStatus: FileProgress['metadataStatus']) =>
      createMockState({
        totalFiles: 1,
        files: [{ ...createMockFile(0, 'photo.png', 'complete'), metadataStatus }],
      });

    it('shows the generating subline with an indeterminate bar while metadata is in flight', () => {
      setup(completedWithMetadata('generating'));

      expect(screen.getByText('Uploaded • Generating metadata…')).toBeInTheDocument();
      // Generation reports no fraction, so the bar carries no aria-valuenow.
      expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
    });

    it('shows no progress bar once the metadata phase has settled', () => {
      setup(completedWithMetadata('generated'));

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('shows the generated subline once metadata succeeds', () => {
      setup(completedWithMetadata('generated'));

      expect(screen.getByText('Uploaded • Metadata generated')).toBeInTheDocument();
    });

    it('shows the skipped subline when the server skipped the file', () => {
      setup(completedWithMetadata('skipped'));

      expect(screen.getByText('Upload complete • Metadata generation skipped')).toBeInTheDocument();
    });

    it('shows the failed subline when metadata generation fails', () => {
      setup(completedWithMetadata('failed'));

      expect(screen.getByText('Upload complete • Metadata generation failed')).toBeInTheDocument();
    });

    it('falls back to the plain uploaded subline for rows with no metadata phase', () => {
      setup(completedWithMetadata(undefined));

      expect(screen.getByText('Uploaded')).toBeInTheDocument();
    });

    it('still reports the upload as successful when metadata failed', () => {
      setup(completedWithMetadata('failed'));

      // Metadata is a per-row annotation — it must not affect header completion.
      expect(screen.getByText('Upload successful!')).toBeInTheDocument();
      expect(screen.getByText(/uploaded successfully/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    it('still reports the upload as successful when metadata was skipped', () => {
      setup(completedWithMetadata('skipped'));

      expect(screen.getByText('Upload successful!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    it('does not block closing while metadata generation is still in flight', () => {
      setup(completedWithMetadata('generating'));

      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });

  describe('HeaderStatus - metadata subtitle', () => {
    it('shows count-based metadata progress while generation is in flight', () => {
      setup(
        createMockState({
          totalFiles: 2,
          files: [
            { ...createMockFile(0, 'a.png', 'complete'), metadataStatus: 'generated' },
            { ...createMockFile(1, 'b.png', 'complete'), metadataStatus: 'generating' },
          ],
        })
      );

      // 1 of 2 metadata rows settled → 50%
      expect(screen.getByText('Generating metadata with AI (50%)')).toBeInTheDocument();
    });

    it('replaces the in-flight subtitle with the outcome once every row is terminal', () => {
      setup(
        createMockState({
          totalFiles: 2,
          files: [
            { ...createMockFile(0, 'a.png', 'complete'), metadataStatus: 'generated' },
            { ...createMockFile(1, 'b.png', 'complete'), metadataStatus: 'generated' },
          ],
        })
      );

      expect(screen.queryByText(/Generating metadata with AI/)).not.toBeInTheDocument();
      expect(screen.getByText('Metadata successfully generated on 2 files')).toBeInTheDocument();
    });

    it('singularises the outcome message for a single generated file', () => {
      setup(
        createMockState({
          totalFiles: 1,
          files: [{ ...createMockFile(0, 'a.png', 'complete'), metadataStatus: 'generated' }],
        })
      );

      expect(screen.getByText('Metadata successfully generated on 1 file')).toBeInTheDocument();
    });

    it('reports the failure count alongside the generated count', () => {
      setup(
        createMockState({
          totalFiles: 2,
          files: [
            { ...createMockFile(0, 'a.png', 'complete'), metadataStatus: 'generated' },
            { ...createMockFile(1, 'b.png', 'complete'), metadataStatus: 'failed' },
          ],
        })
      );

      expect(screen.queryByText(/Generating metadata with AI/)).not.toBeInTheDocument();
      expect(screen.getByText('1 generated, 1 failed')).toBeInTheDocument();
    });

    it('stays silent when nothing was generated', () => {
      // An all-skipped batch of non-images: "generated on 0 files" would be worse than
      // saying nothing, and the per-row sublines already report the skips.
      setup(
        createMockState({
          totalFiles: 2,
          files: [
            { ...createMockFile(0, 'a.pdf', 'complete'), metadataStatus: 'skipped' },
            { ...createMockFile(1, 'b.pdf', 'complete'), metadataStatus: 'skipped' },
          ],
        })
      );

      expect(screen.queryByText(/Generating metadata with AI/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Metadata successfully generated/)).not.toBeInTheDocument();
    });

    it('counts only generated rows, ignoring skipped ones', () => {
      setup(
        createMockState({
          totalFiles: 3,
          files: [
            { ...createMockFile(0, 'a.png', 'complete'), metadataStatus: 'generated' },
            { ...createMockFile(1, 'b.png', 'complete'), metadataStatus: 'generated' },
            { ...createMockFile(2, 'c.pdf', 'complete'), metadataStatus: 'skipped' },
          ],
        })
      );

      expect(screen.getByText('Metadata successfully generated on 2 files')).toBeInTheDocument();
    });

    it('keeps the subtitle up between files while later rows are still uploading', () => {
      // Nothing is generating at this instant — file 0's generation beat file 1's upload
      // — but the phase is not over, so the subtitle must not blink out.
      setup(
        createMockState({
          totalFiles: 2,
          files: [
            { ...createMockFile(0, 'a.png', 'complete'), metadataStatus: 'generated' },
            createMockFile(1, 'b.png', 'uploading'),
          ],
        })
      );

      // 1 settled of 2 expected, counting the row still uploading.
      expect(screen.getByText('Generating metadata with AI (50%)')).toBeInTheDocument();
    });

    it('hides the subtitle when no row entered the metadata phase (AI disabled)', () => {
      setup(
        createMockState({
          totalFiles: 1,
          files: [createMockFile(0, 'photo.png', 'complete')],
        })
      );

      expect(screen.queryByText(/Generating metadata with AI/)).not.toBeInTheDocument();
    });
  });

  describe('FileRowRenderer - error file', () => {
    it('displays error files with error message', async () => {
      setup(
        createMockState({
          files: [createMockFile(0, 'error-file.png', 'error', 'File size exceeded')],
        })
      );
      await waitFor(() => {
        expect(screen.getByText('error-file.png')).toBeInTheDocument();
      });
      expect(screen.getByText('File size exceeded')).toBeInTheDocument();
    });
  });

  describe('FileRowRenderer - cancelled file', () => {
    it('displays cancelled files with canceled indicator', () => {
      setup(
        createMockState({
          files: [createMockFile(0, 'cancelled-file.png', 'cancelled')],
        })
      );
      expect(screen.getByText('cancelled-file.png')).toBeInTheDocument();
      expect(screen.getByText('Canceled')).toBeInTheDocument();
    });
  });

  describe('File list sorting', () => {
    it('sorts completed files by priority: error > cancelled > complete', () => {
      setup(
        createMockState({
          files: [
            createMockFile(0, 'complete-file.png', 'complete'),
            createMockFile(1, 'cancelled-file.png', 'cancelled'),
            createMockFile(2, 'error-file.png', 'error', 'Some error'),
          ],
        })
      );

      const fileNames = screen.getAllByText(/file\.png/);
      expect(fileNames[0]).toHaveTextContent('error-file.png');
      expect(fileNames[1]).toHaveTextContent('cancelled-file.png');
      expect(fileNames[2]).toHaveTextContent('complete-file.png');
    });
  });

  describe('Concurrent uploads', () => {
    it('renders a row for every file currently uploading, not just the first', () => {
      // Concurrent uploads leave several files `uploading` at once; the dialog
      // must show them all (regression: a `find` rendered only the first).
      setup(
        createMockState({
          totalFiles: 4,
          files: [
            createMockFile(0, 'uploading-a.png', 'uploading'),
            createMockFile(1, 'uploading-b.png', 'uploading'),
            createMockFile(2, 'uploading-c.png', 'uploading'),
            createMockFile(3, 'pending-d.png', 'pending'),
          ],
        })
      );

      expect(screen.getByText('uploading-a.png')).toBeInTheDocument();
      expect(screen.getByText('uploading-b.png')).toBeInTheDocument();
      expect(screen.getByText('uploading-c.png')).toBeInTheDocument();
    });
  });
});
