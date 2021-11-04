import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import SearchIcon from '@strapi/icons/Search';
import { Searchbar, SearchForm } from '@strapi/design-system/Searchbar';
import { IconButton } from '@strapi/design-system/IconButton';
import useQueryParams from '../../hooks/useQueryParams';
import useTracking from '../../hooks/useTracking';

const SearchURLQuery = ({ label, trackedEvent }) => {
  const wrapperRef = useRef(null);
  const iconButtonRef = useRef(null);
  const isMountedRef = useRef(false);
  const [didSearch, setDidSearch] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [{ query }, setQuery] = useQueryParams();
  const [value, setValue] = useState(query?._q || '');
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const handleToggle = () => setIsOpen(prev => !prev);

  useEffect(() => {
    if (isMountedRef.current) {
      if (isOpen) {
        wrapperRef.current.querySelector('input').focus();
      }
    }

    isMountedRef.current = true;
  }, [isOpen]);

  useEffect(() => {
    if (value && !isOpen) {
      handleToggle();
    }
  }, [value, isOpen]);

  const handleClear = () => {
    setValue('');
    setQuery({ _q: '' }, 'remove');
  };

  const handleSubmit = e => {
    e.preventDefault();

    setQuery({ _q: value, page: 1 });
  };

  useEffect(() => {
    if (didSearch && trackedEvent) {
      trackUsage(trackedEvent);
    }
  }, [didSearch, trackedEvent, trackUsage]);

  if (isOpen) {
    return (
      <div ref={wrapperRef}>
        <SearchForm onSubmit={handleSubmit}>
          <Searchbar
            name="search"
            onChange={({ target: { value } }) => {
              setDidSearch(true);
              setValue(value);
            }}
            value={value}
            clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
            onClear={handleClear}
            size="S"
          >
            {label}
          </Searchbar>
        </SearchForm>
      </div>
      // <div ref={wrapperRef}>
      //   <Searchbar
      //     name="search"
      //     onChange={({ target: { value } }) => {
      //       setDidSearch(true);
      //       setValue(value);
      //     }}
      //     value={value}
      //     clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
      //     onClear={() => {
      //       setValue('');
      //       setIsOpen(false);
      //       setDidSearch(false);
      //     }}
      //   >
      //     {label}
      //   </Searchbar>
      // </div>
    );
  }

  return (
    <IconButton ref={iconButtonRef} icon={<SearchIcon />} label="Search" onClick={handleToggle} />
  );
};

SearchURLQuery.defaultProps = {
  trackedEvent: null,
};

SearchURLQuery.propTypes = {
  label: PropTypes.string.isRequired,
  trackedEvent: PropTypes.string,
};

export default SearchURLQuery;
