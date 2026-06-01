import { render, screen, fireEvent, waitFor } from '@tests/utils';

import { CreateFolderDialog } from '../CreateFolderDialog';

const mockToggleNotification = jest.fn();
const mockUnwrap = jest.fn();
const mockCreateFolder = jest.fn().mockReturnValue({ unwrap: mockUnwrap });

jest.mock('../../../../services/folders', () => ({
  useCreateFolderMutation: () => [mockCreateFolder, { isLoading: false }],
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useNotification: () => ({ toggleNotification: mockToggleNotification }),
}));

const defaultProps = {
  open: true,
  folderName: 'Home',
  parentFolderId: null,
  onClose: jest.fn(),
};

describe('CreateFolderDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnwrap.mockResolvedValue({});
  });

  it('renders modal with title "New folder in Home" and a "Folder name" input', () => {
    render(<CreateFolderDialog {...defaultProps} />);

    expect(screen.getByText('New folder in Home')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    // Field label
    expect(screen.getByText('Folder name')).toBeInTheDocument();
  });

  it('Cancel button calls onClose', () => {
    const onClose = jest.fn();
    render(<CreateFolderDialog {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows inline "Name is required" error and does not call API when submitting with empty name', async () => {
    render(<CreateFolderDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /create folder/i }));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
    expect(mockCreateFolder).not.toHaveBeenCalled();
  });

  it('shows inline error and does not call API when submitting with whitespace-only name', async () => {
    render(<CreateFolderDialog {...defaultProps} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /create folder/i }));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
    expect(mockCreateFolder).not.toHaveBeenCalled();
  });

  it('calls createFolder with trimmed name and null parent when parentFolderId is null', async () => {
    render(<CreateFolderDialog {...defaultProps} parentFolderId={null} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My Folder' } });
    fireEvent.click(screen.getByRole('button', { name: /create folder/i }));

    await waitFor(() => {
      expect(mockCreateFolder).toHaveBeenCalledWith({ name: 'My Folder', parent: null });
    });
  });

  it('calls createFolder with the current parentFolderId as parent', async () => {
    render(<CreateFolderDialog {...defaultProps} parentFolderId={5} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Sub Folder' } });
    fireEvent.click(screen.getByRole('button', { name: /create folder/i }));

    await waitFor(() => {
      expect(mockCreateFolder).toHaveBeenCalledWith({ name: 'Sub Folder', parent: 5 });
    });
  });

  it('on success: calls toggleNotification with type "success" and calls onClose', async () => {
    const onClose = jest.fn();
    render(<CreateFolderDialog {...defaultProps} onClose={onClose} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New Folder' } });
    fireEvent.click(screen.getByRole('button', { name: /create folder/i }));

    await waitFor(() => {
      expect(mockToggleNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows inline API validation error (e.g. duplicate name) below the input', async () => {
    mockUnwrap.mockRejectedValue({ message: 'A folder with that name already exists' });
    render(<CreateFolderDialog {...defaultProps} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Existing Folder' } });
    fireEvent.click(screen.getByRole('button', { name: /create folder/i }));

    await waitFor(() => {
      expect(screen.getByText('A folder with that name already exists')).toBeInTheDocument();
    });
    expect(mockToggleNotification).not.toHaveBeenCalled();
  });

  it('calls toggleNotification with type "danger" on unknown API error', async () => {
    mockUnwrap.mockRejectedValue({});
    render(<CreateFolderDialog {...defaultProps} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Some Folder' } });
    fireEvent.click(screen.getByRole('button', { name: /create folder/i }));

    await waitFor(() => {
      expect(mockToggleNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'danger' })
      );
    });
  });

  it('renders the folderName in the dialog title', () => {
    render(<CreateFolderDialog {...defaultProps} folderName="Documents" />);

    expect(screen.getByText('New folder in Documents')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<CreateFolderDialog {...defaultProps} open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clears name and error when reopened', async () => {
    const { rerender } = render(<CreateFolderDialog {...defaultProps} open={true} />);

    // Type a name and trigger an error
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: /create folder/i }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();

    // Close and reopen
    rerender(<CreateFolderDialog {...defaultProps} open={false} />);
    rerender(<CreateFolderDialog {...defaultProps} open={true} />);

    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });
});
