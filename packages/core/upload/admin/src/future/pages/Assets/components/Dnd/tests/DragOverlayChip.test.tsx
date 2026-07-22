import { render, screen } from '@tests/utils';

import { DragOverlayChip } from '../DragOverlayChip';

import type { DragItemData } from '../../../../../types/dnd';

describe('DragOverlayChip', () => {
  it('renders the single-item chip with the item name', () => {
    const item: DragItemData = {
      kind: 'file',
      id: 10,
      name: 'hero.png',
      folderId: 1,
    };

    render(<DragOverlayChip items={[item]} />);

    expect(screen.getByText('hero.png')).toBeInTheDocument();
  });

  it('renders folder and file counts with a total badge for multiple items', () => {
    const items: DragItemData[] = [
      { kind: 'folder', id: 1, name: 'A', parentId: null },
      { kind: 'folder', id: 2, name: 'B', parentId: null },
      { kind: 'file', id: 10, name: 'a.png', folderId: null },
      { kind: 'file', id: 11, name: 'b.png', folderId: null },
      { kind: 'file', id: 12, name: 'c.png', folderId: null },
    ];

    render(<DragOverlayChip items={items} />);

    expect(screen.getByText('2 folders')).toBeInTheDocument();
    expect(screen.getByText('3 files')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('omits the folder count when the drag set is files only', () => {
    const items: DragItemData[] = [
      { kind: 'file', id: 10, name: 'a.png', folderId: null },
      { kind: 'file', id: 11, name: 'b.png', folderId: null },
    ];

    render(<DragOverlayChip items={items} />);

    expect(screen.queryByText(/folder/i)).not.toBeInTheDocument();
    expect(screen.getByText('2 files')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
