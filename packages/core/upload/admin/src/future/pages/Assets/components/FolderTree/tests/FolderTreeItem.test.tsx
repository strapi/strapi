import { fireEvent, render, screen } from '@tests/utils';

import { FolderTreeItem } from '../FolderTreeItem';

import type { FolderNode } from '../../../../../../../../shared/contracts/folders';

const leafNode = (id: number, name: string): FolderNode => ({ id, name, children: [] });

const parentNode = (id: number, name: string, children: FolderNode[]): FolderNode => ({
  id,
  name,
  children,
});

const renderItem = (overrides: Partial<React.ComponentProps<typeof FolderTreeItem>> = {}) => {
  const defaultProps: React.ComponentProps<typeof FolderTreeItem> = {
    node: leafNode(1, 'Inner'),
    level: 0,
    currentFolderId: null,
    isExpanded: () => false,
    onToggle: jest.fn(),
    onSelect: jest.fn(),
  };

  return render(
    <ul>
      <FolderTreeItem {...defaultProps} {...overrides} />
    </ul>
  );
};

describe('FolderTreeItem', () => {
  it('renders the folder name', () => {
    renderItem({ node: leafNode(1, 'Photos') });

    expect(screen.getByText('Photos')).toBeInTheDocument();
  });

  it('does not render an expand control when the node has no children', () => {
    renderItem({ node: leafNode(1, 'Photos') });

    expect(screen.queryByRole('button', { name: /expand|collapse/i })).not.toBeInTheDocument();
  });

  it('renders an "Expand" toggle when the node has children and is collapsed', () => {
    renderItem({
      node: parentNode(1, 'Photos', [leafNode(2, 'Vacations')]),
      isExpanded: () => false,
    });

    expect(screen.getByRole('button', { name: /expand photos/i })).toBeInTheDocument();
    expect(screen.queryByText('Vacations')).not.toBeInTheDocument();
  });

  it('renders a "Collapse" toggle and shows children when expanded', () => {
    renderItem({
      node: parentNode(1, 'Photos', [leafNode(2, 'Vacations')]),
      isExpanded: (id) => id === 1,
    });

    expect(screen.getByRole('button', { name: /collapse photos/i })).toBeInTheDocument();
    expect(screen.getByText('Vacations')).toBeInTheDocument();
  });

  it('calls onSelect with the node id when the row is clicked', () => {
    const onSelect = jest.fn();
    renderItem({ node: leafNode(7, 'Inner'), onSelect });

    fireEvent.click(screen.getByRole('button', { name: 'Inner' }));

    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it('calls onToggle (and not onSelect) when the chevron is clicked', () => {
    const onToggle = jest.fn();
    const onSelect = jest.fn();
    renderItem({
      node: parentNode(1, 'Photos', [leafNode(2, 'Vacations')]),
      onToggle,
      onSelect,
    });

    fireEvent.click(screen.getByRole('button', { name: /expand photos/i }));

    expect(onToggle).toHaveBeenCalledWith(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('marks the active folder with aria-current="page"', () => {
    renderItem({ node: leafNode(4, 'Active'), currentFolderId: 4 });

    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-current', 'page');
  });

  it('does not set aria-current on inactive folders', () => {
    renderItem({ node: leafNode(4, 'Other'), currentFolderId: 99 });

    expect(screen.getByRole('button', { name: 'Other' })).not.toHaveAttribute('aria-current');
  });

  it('returns null when the node has no id (defensive)', () => {
    renderItem({
      node: { name: 'Orphan', children: [] } as FolderNode,
    });

    expect(screen.queryByText('Orphan')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
