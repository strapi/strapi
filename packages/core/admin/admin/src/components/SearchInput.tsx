import * as React from 'react';

import { Box, IconButton, Searchbar, SearchForm } from '@strapi/design-system';
import { Search as SearchIcon } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { TrackingEvent, useTracking } from '../features/Tracking';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useQueryParams } from '../hooks/useQueryParams';

interface SearchInputProps {
  disabled?: boolean;
  label: string;
  placeholder?: string;
  trackedEvent?: TrackingEvent['name'] | null;
  trackedEventDetails?: TrackingEvent['properties'];
}

const SearchInput = ({
  disabled,
  label,
  placeholder,
  trackedEvent,
  trackedEventDetails,
}: SearchInputProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const iconButtonRef = React.useRef<HTMLButtonElement>(null);

  const [{ query }, setQuery] = useQueryParams<{ _q: string; page?: number }>();

  const [value, setValue] = React.useState(query?._q || '');
  const [isOpen, setIsOpen] = React.useState(!!value);

  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const isMobile = useIsMobile();

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

  const renderSearchForm = (opts?: { enableBlurClose?: boolean }) => (
    <SearchForm onSubmit={handleSubmit}>
      <Searchbar
        ref={inputRef}
        name="search"
        onChange={(e) => setValue(e.target.value)}
        value={value}
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        onClear={handleClear}
        placeholder={isMobile ? undefined : placeholder}
        disabled={disabled}
        onBlur={
          opts?.enableBlurClose
            ? (e) => {
                if (!e.currentTarget.contains(e.relatedTarget) && e.currentTarget.value === '') {
                  setIsOpen(false);
                }
              }
            : undefined
        }
      >
        {label}
      </Searchbar>
    </SearchForm>
  );

  if (isMobile) {
    // Add wrapper so that the Searchbar takes up the rest of the available space.
    return <Box width="100%">{renderSearchForm()}</Box>;
  }

  if (isOpen) {
    return renderSearchForm({ enableBlurClose: true });
  }

  return (
    <IconButton
      ref={iconButtonRef}
      disabled={disabled}
      label={formatMessage({ id: 'global.search', defaultMessage: 'Search' })}
      onClick={handleToggle}
    >
      <SearchIcon />
    </IconButton>
  );
};

export { SearchInput };
export type { SearchInputProps };
