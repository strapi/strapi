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
  useRetryCancelledFilesStreamMutation: () => [mockRetryCancelledFiles],
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
  error,
});

const createMockState = (overrides: Partial<UploadProgressState> = {}): UploadProgressState => ({
  isVisible: true,
  isMinimized: false,
  progress: 0,
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
      expect(screen.getByTestId('upload-progress-dialog')).toBeInTheDocument();
    });

    it('does not render the dialog when isVisible is false', () => {
      setup(createMockState({ isVisible: false }));
      expect(screen.queryByTestId('upload-progress-dialog')).not.toBeInTheDocument();
    });
  });

  describe('HeaderStatus - uploading state', () => {
    it('displays uploading status with progress percentage', () => {
      setup(
        createMockState({
          progress: 50,
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

    it('shows Cancel button during upload', () => {
      setup(
        createMockState({
          progress: 25,
          files: [
            createMockFile(0, 'file1.png', 'uploading'),
            createMockFile(1, 'file2.png', 'pending'),
          ],
        })
      );
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('calls abortUpload and dispatch cancelUpload when Cancel is clicked', () => {
      setup(
        createMockState({
          uploadId: 5,
          progress: 25,
          files: [createMockFile(0, 'file1.png', 'uploading')],
        })
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(abortUpload).toHaveBeenCalledWith(5);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'uploadProgress/cancelUpload' });
    });
  });

  describe('HeaderStatus - success state', () => {
    it('displays success status when all files are uploaded', async () => {
      setup(
        createMockState({
          progress: 100,
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
          progress: 100,
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
          progress: 100,
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
          progress: 100,
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
          progress: 100,
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
          progress: 100,
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
          progress: 100,
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
  });

  describe('FileRowRenderer - completed file', () => {
    it('displays completed files with uploaded indicator', async () => {
      setup(
        createMockState({
          progress: 100,
          files: [createMockFile(0, 'completed-file.png', 'complete')],
        })
      );
      await waitFor(() => {
        expect(screen.getByText('completed-file.png')).toBeInTheDocument();
      });
      expect(screen.getByText('Uploaded')).toBeInTheDocument();
    });
  });

  describe('FileRowRenderer - error file', () => {
    it('displays error files with error message', async () => {
      setup(
        createMockState({
          progress: 100,
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
          progress: 100,
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
          progress: 100,
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
});
