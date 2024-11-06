// TODO: find a better naming convention for the file that was an index file before
import * as React from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';
import { IconButton, Searchbar, SearchForm } from '@strapi/design-system';
import { Search } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../../utils';

import type { Query } from '../../../../../../shared/contracts/files';

interface SearchAssetProps {
  onChangeSearch: (_q: Query['_q'] | null) => void;
  queryValue?: Query['_q'] | null;
}

export const SearchAsset = ({ onChangeSearch, queryValue = null }: SearchAssetProps) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [isOpen, setIsOpen] = React.useState(!!queryValue);
  const [value, setValue] = React.useState(queryValue || '');
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        wrapperRef.current?.querySelector('input')?.focus();
      }, 0);
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleClear = () => {
    handleToggle();
    onChangeSearch(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    trackUsage('didSearchMediaLibraryElements', { location: 'content-manager' });
    onChangeSearch(value);
  };

  if (isOpen) {
    return (
      <div ref={wrapperRef}>
        <SearchForm onSubmit={handleSubmit}>
          <Searchbar
            name="search"
            onClear={handleClear}
            onChange={(e) => setValue(e.target.value)}
            clearLabel={formatMessage({
              id: getTrad('search.clear.label'),
              defaultMessage: 'Clear the search',
            })}
            aria-label="search"
            size="S"
            value={value}
            placeholder={formatMessage({
              id: getTrad('search.placeholder'),
              defaultMessage: 'e.g: the first dog on the moon',
            })}
          >
            {formatMessage({ id: getTrad('search.label'), defaultMessage: 'Search for an asset' })}
          </Searchbar>
        </SearchForm>
      </div>
    );
  }

  return (
    <IconButton label="Search" onClick={handleToggle}>
      <Search />
    </IconButton>
  );
};
