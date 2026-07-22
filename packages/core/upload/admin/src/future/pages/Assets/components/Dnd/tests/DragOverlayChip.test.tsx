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

  it('renders the single file icon at the enlarged size', () => {
    const item: DragItemData = {
      kind: 'file',
      id: 10,
      name: 'hero.png',
      folderId: 1,
    };

    const { container } = render(<DragOverlayChip items={[item]} />);

    // @strapi/icons render an unnamed <svg>, so there is no accessible query for it.
    // eslint-disable-next-line testing-library/no-container
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('renders the single folder icon at the base size', () => {
    const item: DragItemData = {
      kind: 'folder',
      id: 1,
      name: 'A',
      parentId: null,
    };

    const { container } = render(<DragOverlayChip items={[item]} />);

    // @strapi/icons render an unnamed <svg>, so there is no accessible query for it.
    // eslint-disable-next-line testing-library/no-container
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('height', '20');
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

  it('sizes the composite folder and file count icons to match visually', () => {
    const items: DragItemData[] = [
      { kind: 'folder', id: 1, name: 'A', parentId: null },
      { kind: 'file', id: 10, name: 'a.png', folderId: null },
    ];

    const { container } = render(<DragOverlayChip items={items} />);

    // @strapi/icons render unnamed <svg>s, so there is no accessible query for them.
    // eslint-disable-next-line testing-library/no-container
    const [folderSvg, fileSvg] = Array.from(container.querySelectorAll('svg'));
    expect(folderSvg).toHaveAttribute('width', '20');
    expect(folderSvg).toHaveAttribute('height', '20');
    expect(fileSvg).toHaveAttribute('width', '24');
    expect(fileSvg).toHaveAttribute('height', '24');
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
