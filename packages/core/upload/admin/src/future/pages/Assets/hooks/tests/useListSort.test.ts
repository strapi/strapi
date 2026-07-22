import { renderHook, act } from '@tests/utils';

import { useListSort } from '../useListSort';

const mockSetQuery = jest.fn();
let mockQuery: Record<string, string | undefined> = {};

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useQueryParams: () => [{ query: mockQuery }, mockSetQuery],
}));

describe('useListSort', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = {};
  });

  it('defaults to most recent updates, no direction, folders on top', () => {
    const { result } = renderHook(() => useListSort());

    expect(result.current.sortBy).toBe('mostRecentUpdates');
    expect(result.current.direction).toBeNull();
    expect(result.current.foldersPosition).toBe('top');
    expect(result.current.assetsSort).toBe('updatedAt:DESC');
    // Folders default to the sidebar-tree alphabetical order via the date rule.
    expect(result.current.foldersSort).toBe('updatedAt:DESC');
  });

  it('parses the first recognized rule from the URL — one active rule only', () => {
    mockQuery = { sort: 'createdAt:ASC,name:DESC' };
    const { result } = renderHook(() => useListSort());

    expect(result.current.sortBy).toBe('oldestUploads');
    expect(result.current.direction).toBeNull();
    expect(result.current.assetsSort).toBe('createdAt:ASC');
    expect(result.current.foldersSort).toBe('createdAt:ASC');
  });

  it('drops unknown rules and falls back to the default when nothing valid remains', () => {
    mockQuery = { sort: 'evil:DESC,alsoBad' };
    const { result } = renderHook(() => useListSort());

    expect(result.current.sortBy).toBe('mostRecentUpdates');
    expect(result.current.direction).toBeNull();
  });

  it('supports a pure secondary sort (primary cleared)', () => {
    mockQuery = { sort: 'name:ASC' };
    const { result } = renderHook(() => useListSort());

    expect(result.current.sortBy).toBeNull();
    expect(result.current.direction).toBe('nameAsc');
    expect(result.current.assetsSort).toBe('name:ASC');
  });

  it('excludes size rules from the folders sort and falls back to alphabetical', () => {
    mockQuery = { sort: 'size:DESC' };
    const { result } = renderHook(() => useListSort());

    expect(result.current.assetsSort).toBe('size:DESC');
    expect(result.current.foldersSort).toBe('name:ASC');
  });

  it('picking a direction clears the sort-by (groups are mutually exclusive)', () => {
    mockQuery = { sort: 'updatedAt:DESC' };
    const { result } = renderHook(() => useListSort());

    act(() => result.current.setDirection('sizeAsc'));

    expect(mockSetQuery).toHaveBeenCalledWith({ sort: 'size:ASC' });
  });

  it('picking a sort-by clears the direction (groups are mutually exclusive)', () => {
    mockQuery = { sort: 'name:DESC' };
    const { result } = renderHook(() => useListSort());

    act(() => result.current.setSortBy('oldestUploads'));

    expect(mockSetQuery).toHaveBeenCalledWith({ sort: 'createdAt:ASC' });
  });

  it('removes the sort param when back to the default state', () => {
    mockQuery = { sort: 'createdAt:ASC' };
    const { result } = renderHook(() => useListSort());

    act(() => result.current.setSortBy('mostRecentUpdates'));

    expect(mockSetQuery).toHaveBeenCalledWith({ sort: '' }, 'remove');
  });

  it('never leaves the list without a sort rule: clearing the last facet restores the default', () => {
    mockQuery = { sort: 'name:ASC' };
    const { result } = renderHook(() => useListSort());

    act(() => result.current.setDirection(null));

    expect(mockSetQuery).toHaveBeenCalledWith({ sort: '' }, 'remove');
  });

  it('toggles folders position through the dedicated param', () => {
    const { result } = renderHook(() => useListSort());

    act(() => result.current.setFoldersPosition('mixed'));
    expect(mockSetQuery).toHaveBeenCalledWith({ folders: 'mixed' });

    mockQuery = { folders: 'mixed' };
    const { result: mixed } = renderHook(() => useListSort());
    expect(mixed.current.foldersPosition).toBe('mixed');

    act(() => mixed.current.setFoldersPosition('top'));
    expect(mockSetQuery).toHaveBeenCalledWith({ folders: '' }, 'remove');
  });
});
