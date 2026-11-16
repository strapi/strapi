import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { parse, stringify } from 'qs';

type SetQuery<TQuery> = (nextParams: TQuery, method?: 'push' | 'remove', replace?: boolean) => void;

interface ListQueryState {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
}

const ListQueryStateContext = createContext<ListQueryState | null>(null);

interface ListQueryStateProviderProps {
  children: ReactNode;
}

/**
 * Keeps the list query (folder, search, filters, sort) in memory instead of the
 * URL, for surfaces hosted inside another page — the Content Manager asset
 * picker would otherwise overwrite the entry's own URL. Without this provider,
 * `useListQueryParams` falls back to the URL, which is what the Media Library
 * page relies on.
 */
export const ListQueryStateProvider = ({ children }: ListQueryStateProviderProps) => {
  const [search, setSearch] = useState('');
  const value = useMemo(() => ({ search, setSearch }), [search]);

  return createElement(ListQueryStateContext.Provider, { value }, children);
};

/**
 * Drop-in for `useQueryParams` used by the list hooks. The in-memory store keeps
 * a serialized search string and goes through the same `qs` round trip as the
 * URL, so callers that pre-encode values (`withEncodedUserParams`,
 * `encodeSearchQuery`) read back exactly what they would from the URL.
 */
export const useListQueryParams = <TQuery extends object>() => {
  const urlQueryParams = useQueryParams<TQuery>();
  const memoryState = useContext(ListQueryStateContext);

  const memorySearch = memoryState?.search ?? '';
  const setMemorySearch = memoryState?.setSearch;

  const memoryQuery = useMemo(() => parse(memorySearch) as TQuery, [memorySearch]);

  const setMemoryQuery = useCallback<SetQuery<TQuery>>(
    (nextParams, method = 'push') => {
      if (!setMemorySearch) {
        return;
      }

      setMemorySearch((currentSearch) => {
        const currentQuery = parse(currentSearch) as Partial<TQuery>;
        let nextQuery: Partial<TQuery>;

        if (method === 'remove') {
          nextQuery = { ...currentQuery };
          Object.keys(nextParams).forEach((key) => {
            delete nextQuery[key as keyof TQuery];
          });
        } else {
          nextQuery = { ...currentQuery, ...nextParams };
        }

        return stringify(nextQuery, { encode: false });
      });
    },
    [setMemorySearch]
  );

  if (!memoryState) {
    return urlQueryParams;
  }

  return [{ query: memoryQuery, rawQuery: memorySearch }, setMemoryQuery] as const;
};
