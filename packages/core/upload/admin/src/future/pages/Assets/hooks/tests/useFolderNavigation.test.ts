import { renderHook, act, waitFor } from '@tests/utils';

import { useFolderNavigation } from '../useFolderNavigation';

import type { Folder } from '../../../../../../../shared/contracts/folders';

const mockSetQuery = jest.fn();
const mockUseQueryParams = jest.fn();

const folderFixture: Folder = { id: 7, name: 'Photos', pathId: 7, path: '/7', parent: null };

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useQueryParams: (...args: unknown[]) => mockUseQueryParams(...args),
}));

describe('useFolderNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryParams.mockReturnValue([{ query: {} }, mockSetQuery]);
  });

  it('returns null currentFolderId when no folder query param is present', () => {
    mockUseQueryParams.mockReturnValue([{ query: {} }, mockSetQuery]);

    const { result } = renderHook(() => useFolderNavigation());

    expect(result.current.currentFolderId).toBeNull();
  });

  it('returns numeric currentFolderId when folder query param is set', () => {
    mockUseQueryParams.mockReturnValue([{ query: { folder: '42' } }, mockSetQuery]);

    const { result } = renderHook(() => useFolderNavigation());

    expect(result.current.currentFolderId).toBe(42);
  });

  it('returns null currentFolderId when folder query param is not a finite number', () => {
    mockUseQueryParams.mockReturnValue([{ query: { folder: 'abc' } }, mockSetQuery]);

    const { result } = renderHook(() => useFolderNavigation());

    expect(result.current.currentFolderId).toBeNull();
  });

  it('removes the folder query param when folder value is not a finite number', async () => {
    mockUseQueryParams.mockReturnValue([{ query: { folder: 'abc' } }, mockSetQuery]);

    renderHook(() => useFolderNavigation());

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith({ folder: '' }, 'remove');
    });
  });

  it('returns null currentFolderId when folder query param is NaN', () => {
    mockUseQueryParams.mockReturnValue([{ query: { folder: 'NaN' } }, mockSetQuery]);

    const { result } = renderHook(() => useFolderNavigation());

    expect(result.current.currentFolderId).toBeNull();
  });

  it('calls setQuery with folder id as a string when navigateToFolder is called', () => {
    mockUseQueryParams.mockReturnValue([{ query: {} }, mockSetQuery]);

    const { result } = renderHook(() => useFolderNavigation());

    act(() => {
      result.current.navigateToFolder(folderFixture);
    });

    expect(mockSetQuery).toHaveBeenCalledTimes(1);
    expect(mockSetQuery).toHaveBeenCalledWith({ folder: '7', _q: undefined });
  });

  it('navigateToRoot removes the folder query param', () => {
    mockUseQueryParams.mockReturnValue([{ query: { folder: '7' } }, mockSetQuery]);

    const { result } = renderHook(() => useFolderNavigation());

    act(() => {
      result.current.navigateToRoot();
    });

    expect(mockSetQuery).toHaveBeenCalledTimes(1);
    expect(mockSetQuery).toHaveBeenCalledWith({ folder: '', _q: '' }, 'remove');
  });

  it('navigateToFolderId(null) clears the folder param', () => {
    mockUseQueryParams.mockReturnValue([{ query: { folder: '7' } }, mockSetQuery]);

    const { result } = renderHook(() => useFolderNavigation());

    act(() => {
      result.current.navigateToFolderId(null);
    });

    expect(mockSetQuery).toHaveBeenCalledWith({ folder: '', _q: '' }, 'remove');
  });

  it('navigateToFolderId(id) sets the folder param to that id', () => {
    mockUseQueryParams.mockReturnValue([{ query: {} }, mockSetQuery]);

    const { result } = renderHook(() => useFolderNavigation());

    act(() => {
      result.current.navigateToFolderId(11);
    });

    expect(mockSetQuery).toHaveBeenCalledWith({ folder: '11', _q: undefined });
  });

  describe('clearing the search term on navigation', () => {
    it('drops _q and sets the folder in a single navigation', () => {
      mockUseQueryParams.mockReturnValue([{ query: { _q: 'kitten' } }, mockSetQuery]);

      const { result } = renderHook(() => useFolderNavigation());

      act(() => {
        result.current.navigateToFolder(folderFixture);
      });

      // One call, so the two effects can't derive from the same stale query and
      // clobber each other.
      expect(mockSetQuery).toHaveBeenCalledTimes(1);
      expect(mockSetQuery).toHaveBeenCalledWith({ folder: '7', _q: undefined });
    });

    it('drops _q when the sidebar selects a folder', () => {
      mockUseQueryParams.mockReturnValue([{ query: { _q: 'kitten' } }, mockSetQuery]);

      const { result } = renderHook(() => useFolderNavigation());

      act(() => {
        result.current.navigateToFolderId(11);
      });

      expect(mockSetQuery).toHaveBeenCalledTimes(1);
      expect(mockSetQuery).toHaveBeenCalledWith({ folder: '11', _q: undefined });
    });

    it('removes both folder and _q when navigating to the root', () => {
      mockUseQueryParams.mockReturnValue([{ query: { folder: '7', _q: 'kitten' } }, mockSetQuery]);

      const { result } = renderHook(() => useFolderNavigation());

      act(() => {
        result.current.navigateToRoot();
      });

      expect(mockSetQuery).toHaveBeenCalledTimes(1);
      expect(mockSetQuery).toHaveBeenCalledWith({ folder: '', _q: '' }, 'remove');
    });

    it('only names folder and _q so unrelated params survive the merge', () => {
      mockUseQueryParams.mockReturnValue([
        { query: { _q: 'kitten', sort: 'name:ASC' } },
        mockSetQuery,
      ]);

      const { result } = renderHook(() => useFolderNavigation());

      act(() => {
        result.current.navigateToFolder(folderFixture);
      });

      // setQuery merges the argument into the existing query, so anything the
      // argument doesn't name (a future `sort`, the details drawer id, …) is kept.
      const [nextParams] = mockSetQuery.mock.calls[0];
      expect(Object.keys(nextParams).sort()).toEqual(['_q', 'folder']);
    });

    it('leaves an active search alone when stripping a malformed folder value', async () => {
      mockUseQueryParams.mockReturnValue([
        { query: { folder: 'abc', _q: 'kitten' } },
        mockSetQuery,
      ]);

      renderHook(() => useFolderNavigation());

      await waitFor(() => {
        expect(mockSetQuery).toHaveBeenCalledWith({ folder: '' }, 'remove');
      });
    });
  });
});
