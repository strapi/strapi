import * as React from 'react';

import { Icon, IconButton, Searchbar, SearchForm } from '@strapi/design-system';
import { Search as SearchIcon } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { TrackingEvent, useTracking } from '../features/Tracking';
import { useQueryParams } from '../hooks/useQueryParams';

export interface SearchURLQueryProps {
  label: string;
  placeholder?: string;
  trackedEvent?: TrackingEvent['name'] | null;
  trackedEventDetails?: TrackingEvent['properties'];
}

const SearchURLQuery = ({
  label,
  placeholder,
  trackedEvent,
  trackedEventDetails,
}: SearchURLQueryProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const iconButtonRef = React.useRef<HTMLButtonElement>(null);

  const [{ query }, setQuery] = useQueryParams<{ _q: string; page?: number }>();

  const [value, setValue] = React.useState(query?._q || '');
  const [isOpen, setIsOpen] = React.useState(!!value);

  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const handleToggle = () => setIsOpen((prev) => !prev);

  React.useLayoutEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleClear = () => {
    setValue('');
    setQuery({ _q: '' }, 'remove');
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Ensure value is a string
    if (value) {
      if (trackedEvent) {
        trackUsage(trackedEvent, trackedEventDetails);
      }
      setQuery({ _q: encodeURIComponent(value), page: 1 });
    } else {
      handleToggle();
      setQuery({ _q: '' }, 'remove');
    }
  };

  if (isOpen) {
    return (
      <SearchForm onSubmit={handleSubmit}>
        <Searchbar
          ref={inputRef}
          name="search"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
          value={value}
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          onClear={handleClear}
          size="S"
          placeholder={placeholder}
        >
          {label}
        </Searchbar>
      </SearchForm>
    );
  }

  return (
    <IconButton
      ref={iconButtonRef}
      icon={<Icon as={SearchIcon} color="neutral800" />}
      label={formatMessage({ id: 'global.search', defaultMessage: 'Search' })}
      onClick={handleToggle}
    />
  );
};

export { SearchURLQuery };
