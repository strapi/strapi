import { DndContext } from '@dnd-kit/core';
import { fireEvent, render, screen } from '@tests/utils';

import { FolderTree } from '../FolderTree';

import type { FolderNode } from '../../../../../../../../shared/contracts/folders';

const mockUseGetFolderStructureQuery = jest.fn();

jest.mock('../../../../../services/folders', () => ({
  useGetFolderStructureQuery: (...args: unknown[]) => mockUseGetFolderStructureQuery(...args),
}));

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
    currentFolderId: null,
    onSelectFolder: jest.fn(),
  };

  return render(
    <DndContext>
      <FolderTree {...defaultProps} {...overrides} />
    </DndContext>
  );
};

describe('FolderTree', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetFolderStructureQuery.mockReturnValue({
      data: structure,
      isLoading: false,
      isError: false,
    });
  });

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

  it('toggles a leaf folder chevron without revealing children or navigating', () => {
    const onSelectFolder = jest.fn();
    renderTree({ onSelectFolder });

    const expandLeaf = screen.getByRole('button', { name: /expand top b/i });
    expect(expandLeaf).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(expandLeaf);

    expect(onSelectFolder).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /collapse top b/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.queryByRole('button', { name: 'Inner A1' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /collapse top b/i }));

    expect(screen.getByRole('button', { name: /expand top b/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('does not auto-expand the destination folder when navigating to a leaf', () => {
    renderTree({ currentFolderId: 5 });

    expect(screen.getByRole('button', { name: /expand top b/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
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

  it('puts aria-expanded on the chevron toggle, not the folder row', () => {
    renderTree();

    const expandButton = screen.getByRole('button', { name: /expand top a/i });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Top A' })).not.toHaveAttribute('aria-expanded');
  });

  it('renders the empty-state copy when no folders exist', () => {
    mockUseGetFolderStructureQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    renderTree();

    expect(screen.getByText('No folders yet')).toBeInTheDocument();
  });

  it('shows a loader while folder structure is loading', () => {
    mockUseGetFolderStructureQuery.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    });

    renderTree();

    expect(screen.getByText('Loading folders...')).toBeInTheDocument();
    expect(screen.queryByText('No folders yet')).not.toBeInTheDocument();
  });

  it('shows an error message when folder structure fails to load', () => {
    mockUseGetFolderStructureQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
    });

    renderTree();

    expect(screen.getByText('Could not load folders.')).toBeInTheDocument();
    expect(screen.queryByText('No folders yet')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('keeps Home usable while folder structure is loading', () => {
    mockUseGetFolderStructureQuery.mockReturnValue({
      data: structure,
      isLoading: true,
      isError: false,
    });

    const onSelectFolder = jest.fn();
    renderTree({ onSelectFolder });

    fireEvent.click(screen.getByRole('button', { name: 'Home' }));

    expect(onSelectFolder).toHaveBeenCalledWith(null);
  });

  it('marks the active folder with aria-current="page"', () => {
    renderTree({ currentFolderId: 5 });

    expect(screen.getByRole('button', { name: 'Top B' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Top A' })).not.toHaveAttribute('aria-current');
  });

  it('calls onToggle (and not onSelectFolder) when the chevron is clicked', () => {
    const onSelectFolder = jest.fn();
    renderTree({ onSelectFolder });

    fireEvent.click(screen.getByRole('button', { name: /expand top a/i }));

    expect(onSelectFolder).not.toHaveBeenCalled();
  });

  describe('showActiveFolder', () => {
    it('removes aria-current from every row when false', () => {
      renderTree({ currentFolderId: 3, showActiveFolder: false });

      expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
      expect(screen.getByRole('button', { name: 'Top A' })).not.toHaveAttribute('aria-current');
      expect(screen.getByRole('button', { name: 'Leaf A1a' })).not.toHaveAttribute('aria-current');
    });

    it('removes aria-current from Home when false at the root', () => {
      renderTree({ currentFolderId: null, showActiveFolder: false });

      expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
    });

    it('still expands the ancestor chain so the tree does not collapse', () => {
      renderTree({ currentFolderId: 3, showActiveFolder: false });

      expect(screen.getByRole('button', { name: 'Inner A1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Leaf A1a' })).toBeInTheDocument();
    });
  });

  describe('folder filter', () => {
    const filterFolders = (query: string) => {
      fireEvent.change(screen.getByRole('searchbox', { name: 'Search folders' }), {
        target: { value: query },
      });
    };

    it('prunes the rendered rows to matches', () => {
      renderTree();

      filterFolders('Top B');

      expect(screen.getByRole('button', { name: 'Top B' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Top A' })).not.toBeInTheDocument();
    });

    it('reveals a deep match together with its ancestors', () => {
      renderTree();

      filterFolders('Leaf A1a');

      expect(screen.getByRole('button', { name: 'Top A' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Inner A1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Leaf A1a' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Inner A2' })).not.toBeInTheDocument();
    });

    it('matches case- and accent-insensitively', () => {
      renderTree();

      filterFolders('top b');

      expect(screen.getByRole('button', { name: 'Top B' })).toBeInTheDocument();
    });

    it('keeps Home visible even when nothing matches', () => {
      renderTree();

      filterFolders('nothing matches this');

      expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    });

    it('shows a no-results message distinct from the empty state', () => {
      renderTree();

      filterFolders('nothing matches this');

      expect(screen.getByText('No folders match "nothing matches this"')).toBeInTheDocument();
      expect(screen.queryByText('No folders yet')).not.toBeInTheDocument();
    });

    it('restores the full tree and the prior expansion when cleared', () => {
      renderTree();

      // The user opens Top A themselves, and leaves Top B closed.
      fireEvent.click(screen.getByRole('button', { name: /expand top a/i }));
      expect(screen.getByRole('button', { name: 'Inner A1' })).toBeInTheDocument();

      filterFolders('Top B');
      expect(screen.queryByRole('button', { name: 'Inner A1' })).not.toBeInTheDocument();

      filterFolders('');

      expect(screen.getByRole('button', { name: 'Top B' })).toBeInTheDocument();
      // Their own expansion survived; the filter's force-expansion did not leak.
      expect(screen.getByRole('button', { name: 'Inner A1' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Leaf A1a' })).not.toBeInTheDocument();
    });

    it('does not persist the filter expansion after clearing', () => {
      renderTree();

      filterFolders('Leaf A1a');
      expect(screen.getByRole('button', { name: 'Leaf A1a' })).toBeInTheDocument();

      filterFolders('');

      expect(screen.queryByRole('button', { name: 'Inner A1' })).not.toBeInTheDocument();
    });

    it('does not navigate while filtering', () => {
      const onSelectFolder = jest.fn();
      renderTree({ onSelectFolder });

      filterFolders('Top B');

      expect(onSelectFolder).not.toHaveBeenCalled();
    });

    it('ignores surrounding whitespace', () => {
      renderTree();

      filterFolders('   Top B   ');

      expect(screen.getByRole('button', { name: 'Top B' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Top A' })).not.toBeInTheDocument();
    });
  });
});
