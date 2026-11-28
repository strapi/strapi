import * as React from 'react';

import { Box, IconButton, Searchbar, Typography } from '@strapi/design-system';
import { Search } from '@strapi/icons';
import { useIntl, type IntlShape } from 'react-intl';

/**
 * What a tab searches: its content types and their fields, or its plugins or settings categories
 * and their actions.
 */
type SearchKind = 'contentTypes' | 'plugins' | 'settings';

const getPlaceholder = (formatMessage: IntlShape['formatMessage'], kind: SearchKind) => {
  switch (kind) {
    case 'plugins':
      return formatMessage({
        id: 'Settings.permissions.search.plugins',
        defaultMessage: 'Search plugins and actions',
      });
    case 'settings':
      return formatMessage({
        id: 'Settings.permissions.search.settings',
        defaultMessage: 'Search settings and actions',
      });
    default:
      return formatMessage({
        id: 'Settings.permissions.search.content-types',
        defaultMessage: 'Search content types and fields',
      });
  }
};

const getEmptyMessage = (
  formatMessage: IntlShape['formatMessage'],
  kind: SearchKind,
  query: string
) => {
  switch (kind) {
    case 'plugins':
      return formatMessage(
        {
          id: 'Settings.permissions.search.empty.plugins',
          defaultMessage: 'No plugins or actions match “{query}”.',
        },
        { query }
      );
    case 'settings':
      return formatMessage(
        {
          id: 'Settings.permissions.search.empty.settings',
          defaultMessage: 'No settings or actions match “{query}”.',
        },
        { query }
      );
    default:
      return formatMessage(
        {
          id: 'Settings.permissions.search.empty.content-types',
          defaultMessage: 'No content types or fields match “{query}”.',
        },
        { query }
      );
  }
};

/**
 * Enter must not reach the form the editor is in: it would save the role.
 */
const preventSubmit = (event: React.KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault();
  }
};

interface PermissionsSearchProps {
  kind: SearchKind;
  onChange: (query: string) => void;
  /** The text as typed. */
  value: string;
}

/**
 * The search of a tab: a button that opens a search box, which closes again when it loses the
 * focus empty. The text is the caller's, who decides what to list with it.
 */
const PermissionsSearch = ({ kind, onChange, value }: PermissionsSearchProps) => {
  const { formatMessage } = useIntl();
  const [isOpen, setIsOpen] = React.useState(value !== '');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const label = getPlaceholder(formatMessage, kind);

  React.useLayoutEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <IconButton type="button" label={label} onClick={() => setIsOpen(true)}>
        <Search />
      </IconButton>
    );
  }

  return (
    <Box maxWidth="32rem" onKeyDownCapture={preventSubmit}>
      <Searchbar
        ref={inputRef}
        name="permissions-search"
        value={value}
        placeholder={label}
        onChange={(event) => onChange(event.target.value)}
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        onClear={() => onChange('')}
        onBlur={(event) => {
          if (event.currentTarget.value === '') {
            setIsOpen(false);
          }
        }}
      >
        {label}
      </Searchbar>
    </Box>
  );
};

interface NoSearchResultsProps {
  kind: SearchKind;
  /** The search as typed. */
  query: string;
}

/**
 * Shown in place of a tab's list when the search leaves nothing.
 */
const NoSearchResults = ({ kind, query }: NoSearchResultsProps) => {
  const { formatMessage } = useIntl();

  return (
    <Box padding={6}>
      <Typography role="status" textColor="neutral600">
        {getEmptyMessage(formatMessage, kind, query.trim())}
      </Typography>
    </Box>
  );
};

export { NoSearchResults, PermissionsSearch };
export type { SearchKind };
