import { useState } from 'react';

import { DndContext } from '@dnd-kit/core';
import { fireEvent, render, screen, waitFor } from '@tests/utils';

import { FolderTree, getIndentRem } from '../FolderTree';

import type { FolderNode } from '../../../../../../../shared/contracts/folders';

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

  it('unrotates the chevron when a folder loses its last subfolder', async () => {
    const { user, rerender } = renderTree();

    // Nested, so its parent has to be open before it is on screen.
    await user.click(await screen.findByRole('button', { name: 'Expand Top A' }));
    // Expand "Inner A1", which has one child.
    await user.click(await screen.findByRole('button', { name: 'Expand Inner A1' }));
    expect(screen.getByRole('button', { name: 'Collapse Inner A1' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    // That child is moved away — the row is still in the expanded set, but has
    // nothing left to show.
    mockUseGetFolderStructureQuery.mockReturnValue({
      data: [
        {
          id: 1,
          name: 'Top A',
          children: [
            { id: 2, name: 'Inner A1', children: [] },
            { id: 4, name: 'Inner A2', children: [] },
          ],
        },
        { id: 5, name: 'Top B', children: [] },
      ],
      isLoading: false,
      isError: false,
    });

    rerender(
      <DndContext>
        <FolderTree currentFolderId={null} onSelectFolder={jest.fn()} />
      </DndContext>
    );

    // Back to a leaf, and the chevron points at rest rather than staying turned
    // down over an empty folder.
    const leaf = await screen.findByRole('button', {
      name: 'The folder Inner A1 has no subfolders',
    });
    // eslint-disable-next-line testing-library/no-node-access
    const chevron = leaf.querySelector('svg') as SVGElement;

    expect(window.getComputedStyle(chevron).transform).toBe('rotate(-90deg)');
  });

  it('offers the folder actions on a tree row, without Rename', async () => {
    const { user } = renderTree();

    await user.click((await screen.findAllByRole('button', { name: /Actions for/ }))[0]);

    expect(
      await screen.findByRole('menuitem', { name: 'Copy link to folder' })
    ).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Move to folder' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete folder' })).toBeInTheDocument();
    // Renaming is a list affordance; the tree does not offer it.
    expect(screen.queryByRole('menuitem', { name: 'Rename folder' })).not.toBeInTheDocument();
  });

  it('ignores a right-click inside the menu it opened', async () => {
    renderTree();

    fireEvent.contextMenu(screen.getByTestId('folder-tree-node-5'), { clientX: 10, clientY: 10 });
    const item = await screen.findByRole('menuitem', { name: 'Delete folder' });

    // The menu is portaled, but still bubbles through the row in the React tree.
    // `true` means nothing called `preventDefault`.
    expect(fireEvent.contextMenu(item, { clientX: 50, clientY: 50 })).toBe(true);
    expect(screen.getAllByRole('menu')).toHaveLength(1);
  });

  it('gives focus back to the row when its right-click menu is closed with Escape', async () => {
    const { user } = renderTree();
    const row = screen.getByTestId('folder-tree-node-5');

    fireEvent.contextMenu(row, { clientX: 10, clientY: 10 });
    expect(await screen.findByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(row).toHaveFocus());
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

  describe('deeply nested folders', () => {
    /**
     * L0 > L1 > … > L6, where L{d} has id 10 + d and sits at depth d. Each level
     * also holds a sibling S{d} (id 20 + d), and L6 has one subfolder C (id 30).
     */
    const buildDeepStructure = (): FolderNode[] => {
      let level: FolderNode[] = [{ id: 30, name: 'C', children: [] }];

      for (let d = 6; d >= 0; d -= 1) {
        level = [
          { id: 10 + d, name: `L${d}`, children: level },
          { id: 20 + d, name: `S${d}`, children: [] },
        ];
      }

      return [...level, { id: 99, name: 'Other root', children: [] }];
    };

    const summaryRow = () => screen.getByTestId('folder-tree-hidden-ancestors');

    beforeEach(() => {
      mockUseGetFolderStructureQuery.mockReturnValue({
        data: buildDeepStructure(),
        isLoading: false,
        isError: false,
      });
    });

    it('renders the full branch while the selected folder is up to 3 levels deep', () => {
      renderTree({ currentFolderId: 13 });

      expect(screen.queryByTestId('folder-tree-hidden-ancestors')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'L1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'L2' })).toBeInTheDocument();
    });

    it('folds the ancestors between the root and the parent from depth 4', () => {
      renderTree({ currentFolderId: 14 });

      expect(summaryRow()).toHaveTextContent('2 parent folders');
      expect(summaryRow()).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('button', { name: 'L1' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'L2' })).not.toBeInTheDocument();
      // Siblings of a hidden ancestor go with it.
      expect(screen.queryByRole('button', { name: 'S1' })).not.toBeInTheDocument();

      for (const name of ['L0', 'L3', 'L4', 'S4', 'Other root']) {
        expect(screen.getByRole('button', { name })).toBeInTheDocument();
      }
      expect(screen.getByRole('button', { name: 'L4' })).toHaveAttribute('aria-current', 'page');
    });

    it('counts d - 2 hidden folders', () => {
      renderTree({ currentFolderId: 16 });

      expect(summaryRow()).toHaveTextContent('4 parent folders');
    });

    it('lists the hidden folders, shallowest first, when the summary row is opened', async () => {
      const { user } = renderTree({ currentFolderId: 15 });

      await user.click(summaryRow());

      expect(summaryRow()).toHaveAttribute('aria-expanded', 'true');
      const hiddenRows = screen
        .getAllByRole('button')
        .filter((button) => ['L1', 'L2', 'L3'].includes(button.textContent ?? ''));
      expect(hiddenRows.map((button) => button.textContent)).toEqual(['L1', 'L2', 'L3']);

      // Their next folder is already the row below, so they can't expand.
      expect(screen.queryByRole('button', { name: /expand L1/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /collapse L1/i })).not.toBeInTheDocument();

      await user.click(summaryRow());

      expect(summaryRow()).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('button', { name: 'L1' })).not.toBeInTheDocument();
    });

    it('keeps the actions menu on a hidden folder row', async () => {
      const { user } = renderTree({ currentFolderId: 14 });

      await user.click(summaryRow());

      expect(screen.getByRole('button', { name: 'Actions for L1' })).toBeInTheDocument();
    });

    it('navigates to a hidden folder when it is clicked', async () => {
      const onSelectFolder = jest.fn();
      const { user } = renderTree({ currentFolderId: 15, onSelectFolder });

      await user.click(summaryRow());
      await user.click(screen.getByRole('button', { name: 'L2' }));

      expect(onSelectFolder).toHaveBeenCalledWith(12);
    });

    it('closes the summary row when the selection changes', async () => {
      const { user, rerender } = renderTree({ currentFolderId: 15 });

      await user.click(summaryRow());
      expect(summaryRow()).toHaveAttribute('aria-expanded', 'true');

      rerender(
        <DndContext>
          <FolderTree currentFolderId={16} onSelectFolder={jest.fn()} />
        </DndContext>
      );

      expect(summaryRow()).toHaveAttribute('aria-expanded', 'false');
      expect(summaryRow()).toHaveTextContent('4 parent folders');
    });

    it('stays closed when coming back to the folder it was opened on', async () => {
      const { user, rerender } = renderTree({ currentFolderId: 15 });

      await user.click(summaryRow());

      for (const currentFolderId of [16, 15]) {
        rerender(
          <DndContext>
            <FolderTree currentFolderId={currentFolderId} onSelectFolder={jest.fn()} />
          </DndContext>
        );
      }

      expect(summaryRow()).toHaveAttribute('aria-expanded', 'false');
    });

    describe('focus', () => {
      // Selecting re-renders the tree from the new id, as the page does through
      // the URL — that is what remounts the rows.
      const NavigableTree = ({ initialFolderId }: { initialFolderId: number }) => {
        const [currentFolderId, setCurrentFolderId] = useState<number | null>(initialFolderId);

        return (
          <DndContext>
            <FolderTree currentFolderId={currentFolderId} onSelectFolder={setCurrentFolderId} />
          </DndContext>
        );
      };

      it('stays on the selected row after selecting a hidden folder', async () => {
        const { user } = render(<NavigableTree initialFolderId={15} />);

        await user.click(summaryRow());
        screen.getByRole('button', { name: 'L2' }).focus();
        await user.keyboard('{Enter}');

        const row = screen.getByRole('button', { name: 'L2' });
        expect(row).toHaveAttribute('aria-current', 'page');
        expect(row).toHaveFocus();
      });

      it('stays on the selected row when the selection folds the branch', async () => {
        const { user } = render(<NavigableTree initialFolderId={13} />);

        await user.click(screen.getByRole('button', { name: 'Expand L3' }));
        screen.getByRole('button', { name: 'L4' }).focus();
        await user.keyboard('{Enter}');

        expect(summaryRow()).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'L4' })).toHaveFocus();
      });

      it('stays on the selected row when the parent slot moves down a level', async () => {
        const { user } = render(<NavigableTree initialFolderId={14} />);

        await user.click(screen.getByRole('button', { name: 'Expand L4' }));
        screen.getByRole('button', { name: 'L5' }).focus();
        await user.keyboard('{Enter}');

        expect(summaryRow()).toHaveTextContent('3 parent folders');
        expect(screen.getByRole('button', { name: 'L5' })).toHaveFocus();
      });

      it('is not taken when the selection changes from outside the tree', () => {
        const { rerender } = renderTree({ currentFolderId: 13 });

        rerender(
          <DndContext>
            <FolderTree currentFolderId={12} onSelectFolder={jest.fn()} />
          </DndContext>
        );

        expect(document.body).toHaveFocus();
      });

      it('is not taken later after re-selecting the open folder', async () => {
        const onSelectFolder = jest.fn();
        const { user, rerender } = renderTree({ currentFolderId: 13, onSelectFolder });

        screen.getByRole('button', { name: 'L3' }).focus();
        await user.keyboard('{Enter}');
        expect(onSelectFolder).toHaveBeenCalledWith(13);

        screen.getByRole('button', { name: 'L3' }).blur();
        rerender(
          <DndContext>
            <FolderTree currentFolderId={12} onSelectFolder={onSelectFolder} />
          </DndContext>
        );

        expect(document.body).toHaveFocus();
      });
    });

    it('shows the full branch again once the selection is shallow', () => {
      const { rerender } = renderTree({ currentFolderId: 15 });

      rerender(
        <DndContext>
          <FolderTree currentFolderId={12} onSelectFolder={jest.fn()} />
        </DndContext>
      );

      expect(screen.queryByTestId('folder-tree-hidden-ancestors')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'L1' })).toBeInTheDocument();
    });

    it('keeps the folded branch during a search', () => {
      renderTree({ currentFolderId: 15, showActiveFolder: false });

      expect(summaryRow()).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'L5' })).not.toHaveAttribute('aria-current');
    });

    it("shows a folder's full path on hover", async () => {
      const { user } = renderTree({ currentFolderId: 14 });

      await user.hover(screen.getByRole('button', { name: 'L4' }));

      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        'Media Library / L0 / L1 / L2 / L3 / L4'
      );
    });

    it('shows the hidden part of the path on the summary row', async () => {
      const { user } = renderTree({ currentFolderId: 15 });

      await user.hover(summaryRow());

      expect(await screen.findByRole('tooltip')).toHaveTextContent('L1 / L2 / L3');
    });

    it('stops indenting past level 4', () => {
      expect(getIndentRem(3)).toBeLessThan(getIndentRem(4));
      expect(getIndentRem(5)).toBe(getIndentRem(4));
      expect(getIndentRem(11)).toBe(getIndentRem(4));
    });

    it('lets a folder be opened by hand past level 4', async () => {
      const { user } = renderTree();

      // From Home nothing is folded, so the whole chain is opened row by row.
      for (const name of ['L0', 'L1', 'L2', 'L3', 'L4', 'L5']) {
        await user.click(screen.getByRole('button', { name: `Expand ${name}` }));
      }

      expect(screen.getByRole('button', { name: 'L6' })).toBeInTheDocument();
      expect(screen.queryByTestId('folder-tree-hidden-ancestors')).not.toBeInTheDocument();
    });
  });
});
