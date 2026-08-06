import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { useDebounce, useIsMobile, useQueryParams } from '@strapi/admin/strapi-admin';
import { Box, Searchbar, SearchForm } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslationKey } from '../../../utils/translations';
import { useAssetSearch } from '../hooks/useAssetSearch';

const DEBOUNCE_MS = 300;

/**
 * Keyword search over the whole Media Library. Owns the typing state and the
 * debounce; `useAssetSearch` owns the `?_q=` URL param.
 */
export const AssetsSearchInput = () => {
  const { formatMessage } = useIntl();
  const { searchQuery, setSearchQuery } = useAssetSearch();
  const isMobile = useIsMobile();

  const [value, setValue] = useState(searchQuery);
  const debouncedValue = useDebounce(value, DEBOUNCE_MS);

  // Tracks the last value the URL and the input agreed on. Without it the two
  // effects below would ping-pong: each would see the other's write as a change
  // worth reacting to.
  const lastCommittedRef = useRef(searchQuery);

  // Read directly rather than through `useFolderNavigation`, which strips
  // malformed `?folder=` values as a side effect.
  const [{ query }] = useQueryParams<{ folder?: string }>();
  const folderParam = query?.folder ?? '';
  const lastFolderRef = useRef(folderParam);

  // Commit settled input to the URL.
  useEffect(() => {
    if (debouncedValue === lastCommittedRef.current) {
      return;
    }

    lastCommittedRef.current = debouncedValue;
    setSearchQuery(debouncedValue);
  }, [debouncedValue, setSearchQuery]);

  // Re-sync on external changes — back/forward, or "Clear search" in the empty
  // state.
  useEffect(() => {
    if (searchQuery === lastCommittedRef.current) {
      return;
    }

    lastCommittedRef.current = searchQuery;
    setValue(searchQuery);
  }, [searchQuery]);

  // A folder navigation clears `_q`, but a term typed and never committed lives
  // only in the debounce — without this it lands afterwards and reactivates the
  // global search. `_q` alone can't see it: it was never non-empty.
  useEffect(() => {
    if (folderParam === lastFolderRef.current) {
      return;
    }

    lastFolderRef.current = folderParam;
    lastCommittedRef.current = searchQuery;
    setValue(searchQuery);
  }, [folderParam, searchQuery]);

  const searchForm = (
    <SearchForm onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}>
      <Searchbar
        name="search-assets"
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value)}
        onClear={() => setValue('')}
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        placeholder={formatMessage({
          id: getTranslationKey('header.search.placeholder'),
          defaultMessage: 'Search',
        })}
        size="S"
      >
        {formatMessage({
          id: getTranslationKey('search.label'),
          defaultMessage: 'Search for an asset',
        })}
      </Searchbar>
    </SearchForm>
  );

  // TODO: (design question)The input stays visible at every breakpoint; on mobile it takes the full
  // width of the toolbar instead of its intrinsic size.
  if (isMobile) {
    return <Box width="100%">{searchForm}</Box>;
  }

  return searchForm;
};
