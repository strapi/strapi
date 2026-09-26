import { renderHook, act } from '@tests/utils';

import { useAssetSearch } from '../useAssetSearch';

const mockSetQuery = jest.fn();
const mockUseQueryParams = jest.fn();

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useQueryParams: (...args: unknown[]) => mockUseQueryParams(...args),
}));

describe('useAssetSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryParams.mockReturnValue([{ query: {} }, mockSetQuery]);
  });

  it('returns an empty search query when _q is absent', () => {
    const { result } = renderHook(() => useAssetSearch());

    expect(result.current.searchQuery).toBe('');
    expect(result.current.isSearching).toBe(false);
  });

  it('is not searching when _q is present but empty', () => {
    mockUseQueryParams.mockReturnValue([{ query: { _q: '' } }, mockSetQuery]);

    const { result } = renderHook(() => useAssetSearch());

    expect(result.current.isSearching).toBe(false);
  });

  it('reads the already-decoded _q value', () => {
    mockUseQueryParams.mockReturnValue([{ query: { _q: 'a&b' } }, mockSetQuery]);

    const { result } = renderHook(() => useAssetSearch());

    expect(result.current.searchQuery).toBe('a&b');
    expect(result.current.isSearching).toBe(true);
  });

  it('encodes the value and replaces history when setting a search query', () => {
    const { result } = renderHook(() => useAssetSearch());

    act(() => {
      result.current.setSearchQuery('a&b');
    });

    expect(mockSetQuery).toHaveBeenCalledWith({ _q: 'a%26b' }, 'push', true);
  });

  it('escapes a plus sign so it is not decoded back to a space', () => {
    const { result } = renderHook(() => useAssetSearch());

    act(() => {
      result.current.setSearchQuery('report+final');
    });

    expect(mockSetQuery).toHaveBeenCalledWith({ _q: 'report%2Bfinal' }, 'push', true);
  });

  it('removes _q when set to an empty value', () => {
    mockUseQueryParams.mockReturnValue([{ query: { _q: 'img' } }, mockSetQuery]);

    const { result } = renderHook(() => useAssetSearch());

    act(() => {
      result.current.setSearchQuery('');
    });

    expect(mockSetQuery).toHaveBeenCalledWith({ _q: '' }, 'remove', true);
  });

  it('clearSearch removes _q', () => {
    mockUseQueryParams.mockReturnValue([{ query: { _q: 'img' } }, mockSetQuery]);

    const { result } = renderHook(() => useAssetSearch());

    act(() => {
      result.current.clearSearch();
    });

    expect(mockSetQuery).toHaveBeenCalledWith({ _q: '' }, 'remove', true);
  });
});
