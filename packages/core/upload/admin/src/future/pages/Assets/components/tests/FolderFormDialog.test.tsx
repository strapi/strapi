import { render, screen, fireEvent, waitFor } from '@tests/utils';

import { FolderFormDialog } from '../FolderFormDialog';

const mockToggleNotification = jest.fn();
const mockUnwrap = jest.fn();
const mockCreateFolder = jest.fn().mockReturnValue({ unwrap: mockUnwrap });
const mockUpdateUnwrap = jest.fn();
const mockUpdateFolder = jest.fn().mockReturnValue({ unwrap: mockUpdateUnwrap });

jest.mock('../../../../services/folders', () => ({
  useCreateFolderMutation: () => [mockCreateFolder, { isLoading: false }],
  useUpdateFolderMutation: () => [mockUpdateFolder, { isLoading: false }],
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useNotification: () => ({ toggleNotification: mockToggleNotification }),
}));

const createProps = {
  open: true,
  mode: 'create',
  parentFolderName: 'Home',
  parentFolderId: null,
  onClose: jest.fn(),
} satisfies React.ComponentProps<typeof FolderFormDialog>;

const renameProps = {
  open: true,
  mode: 'rename',
  folderId: 5,
  initialName: 'Photos',
  parentFolderId: 7,
  onClose: jest.fn(),
} satisfies React.ComponentProps<typeof FolderFormDialog>;

describe('FolderFormDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnwrap.mockResolvedValue({});
    mockUpdateUnwrap.mockResolvedValue({});
  });

  describe('create mode', () => {
    it('renders modal with title "New folder in Home" and a "Folder name" input', () => {
      render(<FolderFormDialog {...createProps} />);

      expect(screen.getByText('New folder in Home')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      // Field label
      expect(screen.getByText('Folder name')).toBeInTheDocument();
    });

    it('Cancel button calls onClose', () => {
      const onClose = jest.fn();
      render(<FolderFormDialog {...createProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows inline "Name is required" error and does not call API when submitting with empty name', async () => {
      render(<FolderFormDialog {...createProps} />);

      fireEvent.click(screen.getByRole('button', { name: /create folder/i }));

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
      expect(mockCreateFolder).not.toHaveBeenCalled();
    });

    it('shows inline error and does not call API when submitting with whitespace-only name', async () => {
      render(<FolderFormDialog {...createProps} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
      fireEvent.click(screen.getByRole('button', { name: /create folder/i }));

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
      expect(mockCreateFolder).not.toHaveBeenCalled();
    });

    it('calls createFolder with trimmed name and null parent when parentFolderId is null', async () => {
      render(<FolderFormDialog {...createProps} parentFolderId={null} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My Folder' } });
      fireEvent.click(screen.getByRole('button', { name: /create folder/i }));

      await waitFor(() => {
        expect(mockCreateFolder).toHaveBeenCalledWith({ name: 'My Folder', parent: null });
      });
    });

    it('calls createFolder with the current parentFolderId as parent', async () => {
      render(<FolderFormDialog {...createProps} parentFolderId={5} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Sub Folder' } });
      fireEvent.click(screen.getByRole('button', { name: /create folder/i }));

      await waitFor(() => {
        expect(mockCreateFolder).toHaveBeenCalledWith({ name: 'Sub Folder', parent: 5 });
      });
    });

    it('on success: calls toggleNotification with type "success" and calls onClose', async () => {
      const onClose = jest.fn();
      render(<FolderFormDialog {...createProps} onClose={onClose} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New Folder' } });
      fireEvent.click(screen.getByRole('button', { name: /create folder/i }));

      await waitFor(() => {
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'success',
          message: 'Folder has been created',
        });
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows inline API validation error (e.g. duplicate name) below the input', async () => {
      mockUnwrap.mockRejectedValue({ message: 'A folder with that name already exists' });
      render(<FolderFormDialog {...createProps} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Existing Folder' } });
      fireEvent.click(screen.getByRole('button', { name: /create folder/i }));

      await waitFor(() => {
        expect(screen.getByText('A folder with that name already exists')).toBeInTheDocument();
      });
      expect(mockToggleNotification).not.toHaveBeenCalled();
    });

    it('calls toggleNotification with type "danger" on unknown API error', async () => {
      mockUnwrap.mockRejectedValue({});
      render(<FolderFormDialog {...createProps} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Some Folder' } });
      fireEvent.click(screen.getByRole('button', { name: /create folder/i }));

      await waitFor(() => {
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred while creating the folder',
        });
      });
    });

    it('renders the parentFolderName in the dialog title', () => {
      render(<FolderFormDialog {...createProps} parentFolderName="Documents" />);

      expect(screen.getByText('New folder in Documents')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(<FolderFormDialog {...createProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('clears name and error when reopened', async () => {
      const { rerender } = render(<FolderFormDialog {...createProps} open={true} />);

      // Type a name and trigger an error
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '  ' } });
      fireEvent.click(screen.getByRole('button', { name: /create folder/i }));
      expect(await screen.findByText('Name is required')).toBeInTheDocument();

      // Close and reopen
      rerender(<FolderFormDialog {...createProps} open={false} />);
      rerender(<FolderFormDialog {...createProps} open={true} />);

      expect(screen.getByRole('textbox')).toHaveValue('');
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    });
  });

  describe('rename mode', () => {
    it('renders the "Rename folder" title and a "Save" submit button', () => {
      render(<FolderFormDialog {...renameProps} />);

      expect(screen.getByText('Rename folder')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('prefills the input with the current folder name', () => {
      render(<FolderFormDialog {...renameProps} />);

      expect(screen.getByRole('textbox')).toHaveValue('Photos');
    });

    it('selects the whole name on open, so typing replaces it', () => {
      render(<FolderFormDialog {...renameProps} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe('Photos'.length);
    });

    it('disables Save while the name is unchanged and enables it once it differs', () => {
      render(<FolderFormDialog {...renameProps} />);

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Pictures' } });

      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    });

    it('keeps Save disabled when only surrounding whitespace changed', () => {
      render(<FolderFormDialog {...renameProps} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Photos  ' } });

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('calls updateFolder with the id, the trimmed name and the existing parent', async () => {
      render(<FolderFormDialog {...renameProps} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Pictures  ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockUpdateFolder).toHaveBeenCalledWith({
          id: 5,
          name: 'Pictures',
          parent: 7,
        });
      });
      expect(mockCreateFolder).not.toHaveBeenCalled();
    });

    it('sends parent null for a folder that already sits at the root', async () => {
      render(<FolderFormDialog {...renameProps} parentFolderId={null} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Pictures' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockUpdateFolder).toHaveBeenCalledWith({
          id: 5,
          name: 'Pictures',
          parent: null,
        });
      });
    });

    it('on success: toasts and closes', async () => {
      const onClose = jest.fn();
      render(<FolderFormDialog {...renameProps} onClose={onClose} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Pictures' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'success',
          message: 'Folder has been renamed',
        });
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows an API validation error inline without toasting', async () => {
      mockUpdateUnwrap.mockRejectedValue({ message: 'A folder with this name already exists' });
      render(<FolderFormDialog {...renameProps} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Drafts' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(screen.getByText('A folder with this name already exists')).toBeInTheDocument();
      });
      expect(mockToggleNotification).not.toHaveBeenCalled();
    });

    it('toasts a danger message when the failure carries no message', async () => {
      mockUpdateUnwrap.mockRejectedValue({});
      render(<FolderFormDialog {...renameProps} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Drafts' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred while renaming the folder',
        });
      });
    });

    it('shows "Name is required" and calls nothing when the name is cleared', async () => {
      render(<FolderFormDialog {...renameProps} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
      expect(mockUpdateFolder).not.toHaveBeenCalled();
    });
  });
});
