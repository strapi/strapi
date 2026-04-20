import { useQueryParams, usePersistentStateScope } from '@strapi/admin/strapi-admin';
import { renderHook, waitFor } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { usePersistentPartialQueryParams } from '../usePersistentQueryParams';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  useQueryParams: jest.fn(),
  usePersistentStateScope: jest.fn(),
}));

const mockSetQuery = jest.fn();

describe('usePersistentPartialQueryParams', () => {
  const keyPrefix = 'test-prefix-';
  const keysToPersist = ['page', 'pageSize', 'sort'];
  const pathname = '/content-manager/collection-types/api::article.article';
  const key = `${keyPrefix}${pathname}`;

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    (useLocation as jest.Mock).mockReturnValue({ pathname });
    (useQueryParams as jest.Mock).mockReturnValue([{ query: {} }, mockSetQuery]);
    (usePersistentStateScope as jest.Mock).mockReturnValue('test-uuid');
  });

  it('should not load query params if localStorage is empty', () => {
    renderHook(() =>
      usePersistentPartialQueryParams({
        [key]: { paths: keysToPersist },
      })
    );

    expect(mockSetQuery).not.toHaveBeenCalled();
  });

  it('should load query params from localStorage on mount', async () => {
    const savedParams = { page: 2, pageSize: 20, sort: 'name:asc' };
    window.localStorage.setItem(key, JSON.stringify(savedParams));

    renderHook(() =>
      usePersistentPartialQueryParams({
        [key]: { paths: keysToPersist },
      })
    );

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith(savedParams, 'push', true);
    });
  });

  it('should only load persisted keys from localStorage', async () => {
    const savedParams = { page: 2, pageSize: 20, sort: 'name:asc', filters: { name: 'test' } };
    window.localStorage.setItem(key, JSON.stringify(savedParams));

    renderHook(() =>
      usePersistentPartialQueryParams({
        [key]: { paths: keysToPersist },
      })
    );

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

    window.localStorage.setItem(key, JSON.stringify(savedParams));

    (useQueryParams as jest.Mock).mockReturnValue([{ query: existingQuery }, mockSetQuery]);

    renderHook(() =>
      usePersistentPartialQueryParams({
        [key]: { paths: keysToPersist },
      })
    );

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith({ ...existingQuery, ...savedParams }, 'push', true);
    });
  });

  it('should save query params to localStorage when query changes', async () => {
    const query = { page: 3, pageSize: 50, sort: 'createdAt:desc' };

    (useQueryParams as jest.Mock).mockReturnValue([{ query }, mockSetQuery]);

    renderHook(() =>
      usePersistentPartialQueryParams({
        [key]: { paths: keysToPersist },
      })
    );

    await waitFor(() => {
      const saved = window.localStorage.getItem(key);
      expect(saved).toBe(JSON.stringify(query));
    });
  });

  it('should only save persisted keys to localStorage', async () => {
    const query = { page: 3, pageSize: 50, sort: 'createdAt:desc', filters: { name: 'test' } };

    (useQueryParams as jest.Mock).mockReturnValue([{ query }, mockSetQuery]);

    renderHook(() =>
      usePersistentPartialQueryParams({
        [key]: { paths: keysToPersist },
      })
    );

    await waitFor(() => {
      const saved = window.localStorage.getItem(key);
      expect(saved).toBe(JSON.stringify({ page: 3, pageSize: 50, sort: 'createdAt:desc' }));
    });
  });

  it('should not save to localStorage if no persisted keys are present', () => {
    const query = { filters: { name: 'test' } };

    (useQueryParams as jest.Mock).mockReturnValue([{ query }, mockSetQuery]);

    renderHook(() =>
      usePersistentPartialQueryParams({
        [key]: { paths: keysToPersist },
      })
    );

    const saved = window.localStorage.getItem(key);
    expect(saved).toBeNull();
  });

  it('should handle invalid JSON in localStorage gracefully', () => {
    window.localStorage.setItem(key, 'invalid-json');

    renderHook(() =>
      usePersistentPartialQueryParams({
        [key]: { paths: keysToPersist },
      })
    );

    expect(mockSetQuery).not.toHaveBeenCalled();
  });

  it('should handle empty object in localStorage', () => {
    window.localStorage.setItem(key, JSON.stringify({}));

    renderHook(() =>
      usePersistentPartialQueryParams({
        [key]: { paths: keysToPersist },
      })
    );

    expect(mockSetQuery).not.toHaveBeenCalled();
  });

  it('should load different params for different pathnames/keys', async () => {
    const pathname1 = '/path1';
    const pathname2 = '/path2';
    const params1 = { page: 1 };
    const params2 = { page: 2 };

    window.localStorage.setItem(`${keyPrefix}${pathname1}`, JSON.stringify(params1));
    window.localStorage.setItem(`${keyPrefix}${pathname2}`, JSON.stringify(params2));

    renderHook(() =>
      usePersistentPartialQueryParams({
        [`${keyPrefix}${pathname1}`]: { paths: keysToPersist },
      })
    );

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith(params1, 'push', true);
    });

    mockSetQuery.mockClear();
    renderHook(() =>
      usePersistentPartialQueryParams({
        [`${keyPrefix}${pathname2}`]: { paths: keysToPersist },
      })
    );

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith(params2, 'push', true);
    });
  });

  it('should load and merge params from multiple configs', async () => {
    const config = {
      [`LIST_SETTINGS:${pathname}`]: { paths: ['page', 'pageSize', 'sort'] },
      LOCALE: { paths: ['plugins.i18n.locale'] },
    };

    window.localStorage.setItem(
      `LIST_SETTINGS:${pathname}`,
      JSON.stringify({ page: 2, pageSize: 20, sort: 'name:asc' })
    );
    window.localStorage.setItem('LOCALE', JSON.stringify({ plugins: { i18n: { locale: 'en' } } }));

    renderHook(() => usePersistentPartialQueryParams(config));

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith(
        {
          page: 2,
          pageSize: 20,
          sort: 'name:asc',
          plugins: { i18n: { locale: 'en' } },
        },
        'push',
        true
      );
    });
  });

  it('should load scoped config values from scoped localStorage key', async () => {
    const config = {
      'STRAPI_LIST_VIEW_SETTINGS:api::article.article': {
        paths: ['pageSize', 'sort'],
        scoped: true,
      },
    };

    window.localStorage.setItem(
      'STRAPI_LIST_VIEW_SETTINGS:api::article.article:test-uuid',
      JSON.stringify({ pageSize: 20, sort: 'name:asc' })
    );

    renderHook(() => usePersistentPartialQueryParams(config));

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith({ pageSize: 20, sort: 'name:asc' }, 'push', true);
    });
  });

  it('should not load scoped values from unscoped key', () => {
    const config = {
      'STRAPI_LIST_VIEW_SETTINGS:api::article.article': {
        paths: ['pageSize', 'sort'],
        scoped: true,
      },
    };

    window.localStorage.setItem(
      'STRAPI_LIST_VIEW_SETTINGS:api::article.article',
      JSON.stringify({ pageSize: 20, sort: 'name:asc' })
    );

    renderHook(() => usePersistentPartialQueryParams(config));

    expect(mockSetQuery).not.toHaveBeenCalled();
  });
});
