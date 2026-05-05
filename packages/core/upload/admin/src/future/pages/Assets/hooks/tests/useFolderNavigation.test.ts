import { renderHook, act } from '@tests/utils';

import { useFolderNavigation } from '../useFolderNavigation';

import type { Folder } from '../../../../../../../shared/contracts/folders';

const mockSetQuery = jest.fn();
const mockUseQueryParams = jest.fn();

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

  it('calls setQuery with folder id as a string when navigateToFolder is called', () => {
    mockUseQueryParams.mockReturnValue([{ query: {} }, mockSetQuery]);

    const { result } = renderHook(() => useFolderNavigation());

    const folder: Folder = { id: 7, name: 'Photos', pathId: 7, path: '/7', parent: null };

    act(() => {
      result.current.navigateToFolder(folder);
    });

    expect(mockSetQuery).toHaveBeenCalledTimes(1);
    expect(mockSetQuery).toHaveBeenCalledWith({ folder: '7' });
  });
});
