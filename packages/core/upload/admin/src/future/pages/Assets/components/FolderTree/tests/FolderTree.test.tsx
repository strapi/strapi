import { fireEvent, render, screen } from '@tests/utils';

import { FolderTree } from '../FolderTree';

import type { FolderNode } from '../../../../../../../../shared/contracts/folders';

const structure: FolderNode[] = [
  {
    id: 1,
    name: 'Top A',
    children: [
      {
        id: 2,
        name: 'Inner A1',
        children: [{ id: 3, name: 'Leaf A1a', children: [] }],
      },
      { id: 4, name: 'Inner A2', children: [] },
    ],
  },
  { id: 5, name: 'Top B', children: [] },
];

const renderTree = (overrides: Partial<React.ComponentProps<typeof FolderTree>> = {}) => {
  const defaultProps: React.ComponentProps<typeof FolderTree> = {
    folderStructure: structure,
    currentFolderId: null,
    onSelectFolder: jest.fn(),
  };

  return render(<FolderTree {...defaultProps} {...overrides} />);
};

describe('FolderTree', () => {
  it('renders the sidebar landmarks (title, Home, FOLDERS section)', () => {
    renderTree();

    expect(screen.getByRole('navigation', { name: /media library folders/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Media library' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByText('Folders')).toBeInTheDocument();
  });

  it('renders the top-level folder rows', () => {
    renderTree();

    expect(screen.getByRole('button', { name: 'Top A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Top B' })).toBeInTheDocument();
    // Inner folders are hidden until their parent is expanded
    expect(screen.queryByRole('button', { name: 'Inner A1' })).not.toBeInTheDocument();
  });

  it('marks "Home" as the active row when currentFolderId is null', () => {
    renderTree({ currentFolderId: null });

    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Top A' })).not.toHaveAttribute('aria-current');
  });

  it('auto-expands the ancestor chain of the current folder so it becomes visible', () => {
    renderTree({ currentFolderId: 3 });

    expect(screen.getByRole('button', { name: 'Top A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inner A1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leaf A1a' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leaf A1a' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('calls onSelectFolder with null when Home is clicked', () => {
    const onSelectFolder = jest.fn();
    renderTree({ currentFolderId: 1, onSelectFolder });

    fireEvent.click(screen.getByRole('button', { name: 'Home' }));

    expect(onSelectFolder).toHaveBeenCalledWith(null);
  });

  it('calls onSelectFolder with the folder id when a folder row is clicked', () => {
    const onSelectFolder = jest.fn();
    renderTree({ onSelectFolder });

    fireEvent.click(screen.getByRole('button', { name: 'Top A' }));

    expect(onSelectFolder).toHaveBeenCalledWith(1);
  });

  it('expanding a branch via the chevron does not trigger navigation', () => {
    const onSelectFolder = jest.fn();
    renderTree({ onSelectFolder });

    fireEvent.click(screen.getByRole('button', { name: /expand top a/i }));

    expect(onSelectFolder).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Inner A1' })).toBeInTheDocument();
  });

  it('renders the empty-state copy when no folders exist', () => {
    renderTree({ folderStructure: [] });

    expect(screen.getByText('No folders yet')).toBeInTheDocument();
  });

  it('shows a loader while folder structure is loading', () => {
    renderTree({ folderStructure: [], isLoading: true });

    expect(screen.getByText('Loading folders...')).toBeInTheDocument();
    expect(screen.queryByText('No folders yet')).not.toBeInTheDocument();
  });

  it('shows an error message and retry when folder structure fails to load', () => {
    const onRetry = jest.fn();
    renderTree({ folderStructure: [], isError: true, onRetry });

    expect(screen.getByText('Could not load folders.')).toBeInTheDocument();
    expect(screen.queryByText('No folders yet')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps Home usable while folder structure is loading', () => {
    const onSelectFolder = jest.fn();
    renderTree({ isLoading: true, onSelectFolder });

    fireEvent.click(screen.getByRole('button', { name: 'Home' }));

    expect(onSelectFolder).toHaveBeenCalledWith(null);
  });
});
