import { useQueryParams } from '@strapi/admin/strapi-admin';
import { renderHook, waitFor } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { usePersistentPartialQueryParams } from '../usePersistentQueryParams';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  useQueryParams: jest.fn(),
}));

const mockSetQuery = jest.fn();

describe('usePersistentPartialQueryParams', () => {
  const keyPrefix = 'test-prefix-';
  const keysToPersist = ['page', 'pageSize', 'sort'];
  const pathname = '/content-manager/collection-types/api::article.article';

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    (useLocation as jest.Mock).mockReturnValue({ pathname });
    (useQueryParams as jest.Mock).mockReturnValue([{ query: {} }, mockSetQuery]);
  });

  it('should not load query params if localStorage is empty', () => {
    renderHook(() => usePersistentPartialQueryParams(keyPrefix, keysToPersist));

    expect(mockSetQuery).not.toHaveBeenCalled();
  });

  it('should load query params from localStorage on mount', async () => {
    const savedParams = { page: 2, pageSize: 20, sort: 'name:asc' };
    window.localStorage.setItem(`${keyPrefix}${pathname}`, JSON.stringify(savedParams));

    renderHook(() => usePersistentPartialQueryParams(keyPrefix, keysToPersist));

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith(savedParams, 'push', true);
    });
  });

  it('should only load persisted keys from localStorage', async () => {
    const savedParams = { page: 2, pageSize: 20, sort: 'name:asc', filters: { name: 'test' } };
    window.localStorage.setItem(`${keyPrefix}${pathname}`, JSON.stringify(savedParams));

    renderHook(() => usePersistentPartialQueryParams(keyPrefix, keysToPersist));

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith(
        { page: 2, pageSize: 20, sort: 'name:asc' },
        'push',
        true
      );
    });
  });

  it('should merge loaded params with existing query', async () => {
    const savedParams = { page: 2, pageSize: 20 };
    const existingQuery = { filters: { name: 'test' } };

    window.localStorage.setItem(`${keyPrefix}${pathname}`, JSON.stringify(savedParams));

    (useQueryParams as jest.Mock).mockReturnValue([{ query: existingQuery }, mockSetQuery]);

    renderHook(() => usePersistentPartialQueryParams(keyPrefix, keysToPersist));

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith({ ...existingQuery, ...savedParams }, 'push', true);
    });
  });

  it('should save query params to localStorage when query changes', async () => {
    const query = { page: 3, pageSize: 50, sort: 'createdAt:desc' };

    (useQueryParams as jest.Mock).mockReturnValue([{ query }, mockSetQuery]);

    renderHook(() => usePersistentPartialQueryParams(keyPrefix, keysToPersist));

    await waitFor(() => {
      const saved = window.localStorage.getItem(`${keyPrefix}${pathname}`);
      expect(saved).toBe(JSON.stringify(query));
    });
  });

  it('should only save persisted keys to localStorage', async () => {
    const query = { page: 3, pageSize: 50, sort: 'createdAt:desc', filters: { name: 'test' } };

    (useQueryParams as jest.Mock).mockReturnValue([{ query }, mockSetQuery]);

    renderHook(() => usePersistentPartialQueryParams(keyPrefix, keysToPersist));

    await waitFor(() => {
      const saved = window.localStorage.getItem(`${keyPrefix}${pathname}`);
      expect(saved).toBe(JSON.stringify({ page: 3, pageSize: 50, sort: 'createdAt:desc' }));
    });
  });

  it('should not save to localStorage if no persisted keys are present', () => {
    const query = { filters: { name: 'test' } };

    (useQueryParams as jest.Mock).mockReturnValue([{ query }, mockSetQuery]);

    renderHook(() => usePersistentPartialQueryParams(keyPrefix, keysToPersist));

    const saved = window.localStorage.getItem(`${keyPrefix}${pathname}`);
    expect(saved).toBeNull();
  });

  it('should handle invalid JSON in localStorage gracefully', () => {
    window.localStorage.setItem(`${keyPrefix}${pathname}`, 'invalid-json');

    renderHook(() => usePersistentPartialQueryParams(keyPrefix, keysToPersist));

    expect(mockSetQuery).not.toHaveBeenCalled();
  });

  it('should handle empty object in localStorage', () => {
    window.localStorage.setItem(`${keyPrefix}${pathname}`, JSON.stringify({}));

    renderHook(() => usePersistentPartialQueryParams(keyPrefix, keysToPersist));

    expect(mockSetQuery).not.toHaveBeenCalled();
  });

  it('should load different params for different pathnames', async () => {
    const pathname1 = '/path1';
    const pathname2 = '/path2';
    const params1 = { page: 1 };
    const params2 = { page: 2 };

    window.localStorage.setItem(`${keyPrefix}${pathname1}`, JSON.stringify(params1));
    window.localStorage.setItem(`${keyPrefix}${pathname2}`, JSON.stringify(params2));

    (useLocation as jest.Mock).mockReturnValue({ pathname: pathname1 });
    const { rerender } = renderHook(() =>
      usePersistentPartialQueryParams(keyPrefix, keysToPersist)
    );

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith(params1, 'push', true);
    });

    mockSetQuery.mockClear();
    (useLocation as jest.Mock).mockReturnValue({ pathname: pathname2 });
    rerender();

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith(params2, 'push', true);
    });
  });
});
