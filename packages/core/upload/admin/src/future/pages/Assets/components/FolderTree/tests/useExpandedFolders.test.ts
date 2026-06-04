import { act, renderHook } from '@tests/utils';

import { useExpandedFolders } from '../useExpandedFolders';

import type { FolderNode } from '../../../../../../../../shared/contracts/folders';

const buildStructure = (): FolderNode[] => [
  {
    id: 1,
    name: 'Top A',
    children: [
      {
        id: 2,
        name: 'Inner A1',
        children: [
          { id: 3, name: 'Leaf A1a', children: [] },
          { id: 4, name: 'Leaf A1b', children: [] },
        ],
      },
      { id: 5, name: 'Inner A2', children: [] },
    ],
  },
  {
    id: 6,
    name: 'Top B',
    children: [],
  },
];

describe('useExpandedFolders', () => {
  it('starts with everything collapsed when no current folder', () => {
    const { result } = renderHook(() => useExpandedFolders(buildStructure(), null));

    expect(result.current.isExpanded(1)).toBe(false);
    expect(result.current.isExpanded(2)).toBe(false);
    expect(result.current.isExpanded(3)).toBe(false);
  });

  it('auto-expands the ancestor chain of the current folder on mount', () => {
    const { result } = renderHook(() => useExpandedFolders(buildStructure(), 3));

    expect(result.current.isExpanded(1)).toBe(true);
    expect(result.current.isExpanded(2)).toBe(true);
    // Leaf itself isn't auto-expanded — only its ancestors
    expect(result.current.isExpanded(3)).toBe(false);
  });

  it('does not auto-expand siblings outside the current chain', () => {
    const { result } = renderHook(() => useExpandedFolders(buildStructure(), 3));

    expect(result.current.isExpanded(5)).toBe(false);
    expect(result.current.isExpanded(6)).toBe(false);
  });

  it('leaves expansion empty when the current folder is a root node', () => {
    const { result } = renderHook(() => useExpandedFolders(buildStructure(), 1));

    expect(result.current.isExpanded(1)).toBe(false);
    expect(result.current.isExpanded(2)).toBe(false);
  });

  it('toggleExpanded flips the expanded state for a given id', () => {
    const { result } = renderHook(() => useExpandedFolders(buildStructure(), null));

    act(() => result.current.toggleExpanded(1));
    expect(result.current.isExpanded(1)).toBe(true);

    act(() => result.current.toggleExpanded(1));
    expect(result.current.isExpanded(1)).toBe(false);
  });

  it('preserves manual expansion when the current folder changes', () => {
    const { result, rerender } = renderHook(
      ({ currentId }: { currentId: number | null }) =>
        useExpandedFolders(buildStructure(), currentId),
      { initialProps: { currentId: null as number | null } }
    );

    act(() => result.current.toggleExpanded(6));
    expect(result.current.isExpanded(6)).toBe(true);

    rerender({ currentId: 3 });
    expect(result.current.isExpanded(6)).toBe(true);
    expect(result.current.isExpanded(1)).toBe(true);
    expect(result.current.isExpanded(2)).toBe(true);
  });

  it('does nothing when the current folder is not present in the structure', () => {
    const { result } = renderHook(() => useExpandedFolders(buildStructure(), 999));

    expect(result.current.isExpanded(1)).toBe(false);
    expect(result.current.isExpanded(2)).toBe(false);
  });
});
