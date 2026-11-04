import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
} from 'react';

import { useDebounce, useIsMobile } from '@strapi/admin/strapi-admin';
import { Box, IconButton, Searchbar, SearchForm } from '@strapi/design-system';
import { Search as SearchIcon } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useTracking, MEDIA_LIBRARY_LOCATION } from '../../../hooks/useTracking';
import { getTranslationKey } from '../../../utils/translations';
import { useAssetSearch } from '../hooks/useAssetSearch';
import { useListQueryParams } from '../hooks/useListQueryParams';

const DEBOUNCE_MS = 300;

// The DS Searchbar nests two bordered boxes: its own shell (neutral150) wrapping
// the field (neutral200). Side by side they read as a single 2px, two-tone
// border, which sits oddly next to the 1px neutral200 on the Filter button in the
// same toolbar. Dropping the shell's border leaves the field's own — same width
// and colour as the button — and costs nothing, since the focus ring lives on the
// field too.
const StyledSearchForm = styled(SearchForm)`
  > div {
    border: none;
  }
`;

interface AssetsSearchInputProps {
  /**
   * Starts as an icon button that opens the field, which folds back once it
   * loses focus empty, like the admin's own `SearchInput` in list views. Used
   * where the toolbar is narrow (the Content Manager asset picker). Mobile
   * always shows the field.
   */
  collapsible?: boolean;
}

/**
 * Keyword search over the whole Media Library. Owns the typing state and the
 * debounce; `useAssetSearch` owns the `?_q=` URL param.
 */
export const AssetsSearchInput = ({ collapsible = false }: AssetsSearchInputProps) => {
  const { formatMessage } = useIntl();
  const { searchQuery, setSearchQuery } = useAssetSearch();
  const { trackUsage } = useTracking();
  const isMobile = useIsMobile();

  const [value, setValue] = useState(searchQuery);
  const debouncedValue = useDebounce(value, DEBOUNCE_MS);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  // A term keeps the field open: folding it would hide an active search.
  const isCollapsed = collapsible && !isMobile && !isExpanded && value === '';

  // Only after the button opened it: a field shown on mount must not take focus.
  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  // Emptied from elsewhere (a folder opened, the empty state's "Clear search")
  // after the field was left with a term in it: the blur already happened, so
  // fold it here. Not while it has focus: that is the user clearing it to type.
  useEffect(() => {
    if (value === '' && document.activeElement !== inputRef.current) {
      setIsExpanded(false);
    }
  }, [value]);

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (event.currentTarget.value === '') {
      setIsExpanded(false);
    }
  };

  // Tracks the last value the URL and the input agreed on. Without it the two
  // effects below would ping-pong: each would see the other's write as a change
  // worth reacting to.
  const lastCommittedRef = useRef(searchQuery);

  // Read directly rather than through `useFolderNavigation`, which strips
  // malformed `?folder=` values as a side effect.
  const [{ query }] = useListQueryParams<{ folder?: string }>();
  const folderParam = query?.folder ?? '';
  const lastFolderRef = useRef(folderParam);

  // Commit settled input to the URL.
  useEffect(() => {
    if (debouncedValue === lastCommittedRef.current) {
      return;
    }

    lastCommittedRef.current = debouncedValue;
    // Only a real query counts as a search — clearing the box (empty value) is
    // a reset, not a `didSearch`.
    if (debouncedValue) {
      trackUsage('didSearchMediaLibraryElements', { location: MEDIA_LIBRARY_LOCATION });
    }
    setSearchQuery(debouncedValue);
  }, [debouncedValue, setSearchQuery, trackUsage]);

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
    <StyledSearchForm onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}>
      <Searchbar
        ref={inputRef}
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
        onBlur={collapsible ? handleBlur : undefined}
      >
        {formatMessage({
          id: getTranslationKey('search.label'),
          defaultMessage: 'Search for an asset',
        })}
      </Searchbar>
    </StyledSearchForm>
  );

  if (isCollapsed) {
    return (
      <IconButton
        label={formatMessage({ id: 'global.search', defaultMessage: 'Search' })}
        onClick={() => setIsExpanded(true)}
      >
        <SearchIcon />
      </IconButton>
    );
  }

  // Mobile: fills the toolbar row (own line). Desktop: keeps its intrinsic size,
  // with empty space between it and the right-aligned Sort/Toggle group.
  if (isMobile) {
    return <Box width="100%">{searchForm}</Box>;
  }

  return searchForm;
};
