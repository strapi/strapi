import { createElement, type ReactNode } from 'react';

import { withEncodedUserParams } from '@strapi/admin/strapi-admin';
import { renderHook, act } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { useAssetSearch } from '../useAssetSearch';
import { useFolderNavigation } from '../useFolderNavigation';
import { useListFilters } from '../useListFilters';
import { ListQueryStateProvider, useListQueryParams } from '../useListQueryParams';
import { useListSort } from '../useListSort';

const MemoryWrapper = ({ children }: { children: ReactNode }) =>
  createElement(ListQueryStateProvider, null, children);

describe('useListQueryParams', () => {
  describe('without ListQueryStateProvider', () => {
    it('reads and writes the URL', () => {
      const { result } = renderHook(
        () => ({
          params: useListQueryParams<{ folder?: string }>(),
          location: useLocation(),
        }),
        { initialEntries: ['/?folder=3'] }
      );

      expect(result.current.params[0].query.folder).toBe('3');

      act(() => {
        result.current.params[1]({ folder: '7' });
      });

      expect(result.current.location.search).toBe('?folder=7');
    });
  });

  describe('with ListQueryStateProvider', () => {
    it('ignores the URL and starts empty', () => {
      const { result } = renderHook(() => useListQueryParams<{ folder?: string }>(), {
        initialEntries: ['/?folder=3'],
        wrapper: MemoryWrapper,
      });

      expect(result.current[0].query).toEqual({});
    });

    it('merges on push and deletes keys on remove, without touching the URL', () => {
      const { result } = renderHook(
        () => ({
          params: useListQueryParams<{ folder?: string; sort?: string }>(),
          location: useLocation(),
        }),
        { initialEntries: ['/content-manager?plugins[i18n][locale]=en'], wrapper: MemoryWrapper }
      );

      act(() => {
        result.current.params[1]({ folder: '7' });
      });
      act(() => {
        result.current.params[1]({ sort: 'name:ASC' });
      });

      expect(result.current.params[0].query).toEqual({ folder: '7', sort: 'name:ASC' });

      act(() => {
        result.current.params[1]({ folder: '' }, 'remove');
      });

      expect(result.current.params[0].query).toEqual({ sort: 'name:ASC' });
      expect(result.current.location.search).toBe('?plugins[i18n][locale]=en');
    });

    it('applies consecutive writes in the same tick on top of each other', () => {
      const { result } = renderHook(
        () => useListQueryParams<{ folder?: string; sort?: string }>(),
        { wrapper: MemoryWrapper }
      );

      act(() => {
        result.current[1]({ folder: '7' });
        result.current[1]({ sort: 'name:ASC' });
      });

      expect(result.current[0].query).toEqual({ folder: '7', sort: 'name:ASC' });
    });

    it('decodes pre-encoded values the same way the URL does', () => {
      const { result } = renderHook(() => useListQueryParams<{ _q?: string; folder?: string }>(), {
        wrapper: MemoryWrapper,
      });

      act(() => {
        result.current[1]({ _q: 'a%26b' });
      });

      expect(result.current[0].query._q).toBe('a&b');

      act(() => {
        result.current[1](withEncodedUserParams(result.current[0].query, { folder: '2' }));
      });

      expect(result.current[0].query).toEqual({ _q: 'a&b', folder: '2' });
    });

    it('keeps each provider instance isolated', () => {
      const first = renderHook(() => useListQueryParams<{ folder?: string }>(), {
        wrapper: MemoryWrapper,
      });
      const second = renderHook(() => useListQueryParams<{ folder?: string }>(), {
        wrapper: MemoryWrapper,
      });

      act(() => {
        first.result.current[1]({ folder: '7' });
      });

      expect(second.result.current[0].query).toEqual({});
    });
  });

  describe('list hooks inside ListQueryStateProvider', () => {
    it('share one in-memory query and leave the URL alone', () => {
      const { result } = renderHook(
        () => ({
          folder: useFolderNavigation(),
          search: useAssetSearch(),
          filters: useListFilters(),
          sort: useListSort(),
          location: useLocation(),
        }),
        { initialEntries: ['/content-manager/collection-types/api::a.a/1'], wrapper: MemoryWrapper }
      );

      act(() => {
        result.current.folder.navigateToFolderId(4);
      });
      act(() => {
        result.current.search.setSearchQuery('hero & co');
      });
      act(() => {
        result.current.filters.addFilter({ kind: 'type', condition: 'is', values: ['picture'] });
      });
      act(() => {
        result.current.sort.setDirection('nameAsc');
      });

      expect(result.current.folder.currentFolderId).toBe(4);
      expect(result.current.search.searchQuery).toBe('hero & co');
      expect(result.current.filters.filters).toEqual([
        { kind: 'type', condition: 'is', values: ['picture'] },
      ]);
      expect(result.current.sort.direction).toBe('nameAsc');
      expect(result.current.location.search).toBe('');

      // Folder navigation clears the global search, as it does on the page.
      act(() => {
        result.current.folder.navigateToRoot();
      });

      expect(result.current.folder.currentFolderId).toBeNull();
      expect(result.current.search.searchQuery).toBe('');
      expect(result.current.filters.filters).toHaveLength(1);
    });
  });
});
