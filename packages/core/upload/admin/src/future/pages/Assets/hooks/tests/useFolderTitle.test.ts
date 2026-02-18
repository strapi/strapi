import { renderHook } from '@tests/utils';

import { useFolderTitle } from '../useFolderTitle';

const mockUseGetAssetsQuery = jest.fn();
const mockUseGetFolderQuery = jest.fn();

jest.mock('../../../../services/assets', () => ({
  useGetAssetsQuery: (...args: unknown[]) => mockUseGetAssetsQuery(...args),
}));

jest.mock('../../../../services/folders', () => ({
  useGetFolderQuery: (...args: unknown[]) => mockUseGetFolderQuery(...args),
}));

describe('useFolderTitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('root folder (currentFolderId is null)', () => {
    beforeEach(() => {
      mockUseGetFolderQuery.mockReturnValue({ data: undefined, isLoading: false });
    });

    it('returns "Home" when root assets are loading', () => {
      mockUseGetAssetsQuery.mockReturnValue({ data: undefined, isLoading: true });

      const { result } = renderHook(() => useFolderTitle(null));

      expect(result.current.title).toBe('Home');
    });

    it('returns "Home (0 items)" when there are 0 files', () => {
      mockUseGetAssetsQuery.mockReturnValue({
        data: { results: [], pagination: { total: 0 } },
        isLoading: false,
      });

      const { result } = renderHook(() => useFolderTitle(null));

      expect(result.current.title).toBe('Home (0 items)');
    });

    it('returns singular "Home (1 item)" when there is 1 file', () => {
      mockUseGetAssetsQuery.mockReturnValue({
        data: { results: [], pagination: { total: 1 } },
        isLoading: false,
      });

      const { result } = renderHook(() => useFolderTitle(null));

      expect(result.current.title).toBe('Home (1 item)');
    });

    it('returns "Home (5 items)" when there are 5 files', () => {
      mockUseGetAssetsQuery.mockReturnValue({
        data: { results: [], pagination: { total: 5 } },
        isLoading: false,
      });

      const { result } = renderHook(() => useFolderTitle(null));

      expect(result.current.title).toBe('Home (5 items)');
    });
  });

  describe('subfolder (currentFolderId is set)', () => {
    beforeEach(() => {
      mockUseGetAssetsQuery.mockReturnValue({ data: undefined, isLoading: false });
    });

    it('returns "Docs (3 items)" for a loaded subfolder with 3 files', () => {
      mockUseGetFolderQuery.mockReturnValue({
        data: { id: 5, name: 'Docs', files: { count: 3 } },
        isLoading: false,
      });

      const { result } = renderHook(() => useFolderTitle(5));

      expect(result.current.title).toBe('Docs (3 items)');
    });

    it('returns singular "Docs (1 item)" when the folder has 1 file', () => {
      mockUseGetFolderQuery.mockReturnValue({
        data: { id: 5, name: 'Docs', files: { count: 1 } },
        isLoading: false,
      });

      const { result } = renderHook(() => useFolderTitle(5));

      expect(result.current.title).toBe('Docs (1 item)');
    });

    it('falls back to "Home (0 items)" when folder data is not found', () => {
      mockUseGetFolderQuery.mockReturnValue({ data: undefined, isLoading: false });

      const { result } = renderHook(() => useFolderTitle(5));

      expect(result.current.title).toBe('Home (0 items)');
    });
  });
});
