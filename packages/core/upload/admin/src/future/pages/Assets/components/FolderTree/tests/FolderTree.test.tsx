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

  it('offers no expand control on a folder with no subfolders', () => {
    const onSelectFolder = jest.fn();
    renderTree({ onSelectFolder });

    // An enabled chevron on a leaf invites a click that can do nothing: it
    // toggles the row's expanded state with no children to reveal.
    const leafChevron = screen.getByRole('button', {
      name: 'The folder Top B has no subfolders',
    });

    // The DS IconButton marks itself `aria-disabled` rather than using the
    // native attribute, so assert that and — more importantly — that pressing
    // it changes nothing.
    expect(leafChevron).toHaveAttribute('aria-disabled', 'true');
    // Nothing to expand means no expanded state to report.
    expect(leafChevron).not.toHaveAttribute('aria-expanded');
    expect(screen.queryByRole('button', { name: /expand top b/i })).not.toBeInTheDocument();

    fireEvent.click(leafChevron);

    expect(onSelectFolder).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /collapse top b/i })).not.toBeInTheDocument();
  });

  it('mutes the leaf chevron rather than showing a disabled control', () => {
    renderTree();

    // The design system's disabled state is a filled, bordered pill, which draws
    // more attention than the enabled chevron beside it. The override has to
    // outrank that rule, so assert the resolved values, not the declaration.
    const style = window.getComputedStyle(
      screen.getByRole('button', { name: /top b has no subfolders/i })
    );

    // Faded rather than a specific value: how faint reads best is a design call
    // that will get tuned, and pinning the number here only breaks the test.
    // What must hold is that an override applies at all.
    const opacity = Number(style.opacity);

    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
    expect(style.background).toBe('transparent');
    expect(style.borderColor).toBe('transparent');
  });

  it('keeps the expand control on a folder that has subfolders', () => {
    renderTree();

    const parentChevron = screen.getByRole('button', { name: /expand top a/i });

    expect(parentChevron).not.toHaveAttribute('aria-disabled', 'true');
    expect(parentChevron).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not auto-expand the destination folder when navigating to a leaf', () => {
    renderTree({ currentFolderId: 5 });

    expect(screen.getByRole('button', { name: /top b has no subfolders/i })).toHaveAttribute(
      'aria-disabled',
      'true'
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
});
