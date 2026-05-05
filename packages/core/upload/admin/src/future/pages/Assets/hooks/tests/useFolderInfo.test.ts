import { renderHook } from '@tests/utils';

import { useFolderInfo } from '../useFolderInfo';

const mockUseGetAssetsQuery = jest.fn();
const mockUseGetFolderQuery = jest.fn();

jest.mock('../../../../services/assets', () => ({
  useGetAssetsQuery: (...args: unknown[]) => mockUseGetAssetsQuery(...args),
}));

jest.mock('../../../../services/folders', () => ({
  useGetFolderQuery: (...args: unknown[]) => mockUseGetFolderQuery(...args),
}));

describe('useFolderInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('root folder (currentFolderId is null)', () => {
    beforeEach(() => {
      mockUseGetFolderQuery.mockReturnValue({ data: undefined, isLoading: false });
    });

    it('returns title "Home" and itemCount 0 when root assets are loading', () => {
      mockUseGetAssetsQuery.mockReturnValue({ data: undefined, isLoading: true });

      const { result } = renderHook(() => useFolderInfo(null));

      expect(result.current.title).toBe('Home');
      expect(result.current.itemCount).toBe(0);
    });

    it('returns itemCount 0 when there are 0 files', () => {
      mockUseGetAssetsQuery.mockReturnValue({
        data: { results: [], pagination: { total: 0 } },
        isLoading: false,
      });

      const { result } = renderHook(() => useFolderInfo(null));

      expect(result.current.title).toBe('Home');
      expect(result.current.itemCount).toBe(0);
    });

    it('returns itemCount 1 when there is 1 file', () => {
      mockUseGetAssetsQuery.mockReturnValue({
        data: { results: [], pagination: { total: 1 } },
        isLoading: false,
      });

      const { result } = renderHook(() => useFolderInfo(null));

      expect(result.current.title).toBe('Home');
      expect(result.current.itemCount).toBe(1);
    });

    it('returns itemCount 5 when there are 5 files', () => {
      mockUseGetAssetsQuery.mockReturnValue({
        data: { results: [], pagination: { total: 5 } },
        isLoading: false,
      });

      const { result } = renderHook(() => useFolderInfo(null));

      expect(result.current.title).toBe('Home');
      expect(result.current.itemCount).toBe(5);
    });
  });

  describe('subfolder (currentFolderId is set)', () => {
    beforeEach(() => {
      mockUseGetAssetsQuery.mockReturnValue({ data: undefined, isLoading: false });
    });

    it('returns folder name and itemCount 3 for a loaded subfolder with 3 files', () => {
      mockUseGetFolderQuery.mockReturnValue({
        data: { id: 5, name: 'Docs', files: { count: 3 } },
        isLoading: false,
      });

      const { result } = renderHook(() => useFolderInfo(5));

      expect(result.current.title).toBe('Docs');
      expect(result.current.itemCount).toBe(3);
    });

    it('returns folder name and itemCount 1 when the folder has 1 file', () => {
      mockUseGetFolderQuery.mockReturnValue({
        data: { id: 5, name: 'Docs', files: { count: 1 } },
        isLoading: false,
      });

      const { result } = renderHook(() => useFolderInfo(5));

      expect(result.current.title).toBe('Docs');
      expect(result.current.itemCount).toBe(1);
    });

    it('falls back to "Home" with itemCount 0 when folder data is not found', () => {
      mockUseGetFolderQuery.mockReturnValue({ data: undefined, isLoading: false });

      const { result } = renderHook(() => useFolderInfo(5));

      expect(result.current.title).toBe('Home');
      expect(result.current.itemCount).toBe(0);
    });
  });
});
