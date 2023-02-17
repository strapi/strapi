import React, { useLayoutEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Search as SearchIcon } from '@strapi/icons';
import { Searchbar, SearchForm, IconButton, Icon } from '@strapi/design-system';
import useQueryParams from '../../hooks/useQueryParams';
import useTracking from '../../hooks/useTracking';

const SearchURLQuery = ({ label, placeholder, trackedEvent, trackedEventDetails }) => {
  const wrapperRef = useRef(null);
  const iconButtonRef = useRef(null);

  const [{ query }, setQuery] = useQueryParams();
  const [value, setValue] = useState(query?._q || '');
  const [isOpen, setIsOpen] = useState(!!value);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const handleToggle = () => setIsOpen((prev) => !prev);

  useLayoutEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        wrapperRef.current.querySelector('input').focus();
      }, 0);
    }
  }, [isOpen]);

  const handleClear = () => {
    setValue('');
    setQuery({ _q: '' }, 'remove');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

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
      <div ref={wrapperRef}>
        <SearchForm onSubmit={handleSubmit}>
          <Searchbar
            name="search"
            onChange={({ target: { value } }) => setValue(value)}
            value={value}
            clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
            onClear={handleClear}
            size="S"
            placeholder={placeholder}
          >
            {label}
          </Searchbar>
        </SearchForm>
      </div>
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

SearchURLQuery.defaultProps = {
  placeholder: undefined,
  trackedEventDetails: undefined,
  trackedEvent: null,
};

SearchURLQuery.propTypes = {
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  trackedEventDetails: PropTypes.object,
  trackedEvent: PropTypes.string,
};

export default SearchURLQuery;
