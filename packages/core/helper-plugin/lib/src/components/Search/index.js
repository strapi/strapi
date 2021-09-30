import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import SearchIcon from '@strapi/icons/SearchIcon';
import { Searchbar } from '@strapi/parts/Searchbar';
import { IconButton } from '@strapi/parts/IconButton';
import useQueryParams from '../../hooks/useQueryParams';
import useTracking from '../../hooks/useTracking';

const Search = ({ label, trackedEvent }) => {
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
      } else {
        iconButtonRef.current.focus();
      }
    }

    isMountedRef.current = true;
  }, [isOpen]);

  useEffect(() => {
    if (didSearch && trackedEvent) {
      trackUsage(trackedEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [didSearch, trackedEvent]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (value) {
        setQuery({ _q: value, page: 1 });
      } else {
        setDidSearch(false);
        setQuery({ _q: '' }, 'remove');
      }
    }, 300);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (isOpen) {
    return (
      <div ref={wrapperRef}>
        <Searchbar
          name="search"
          onChange={({ target: { value } }) => {
            setDidSearch(true);
            setValue(value);
          }}
          onBlur={() => setIsOpen(false)}
          value={value}
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          onClear={() => {
            setValue('');
            setDidSearch(false);
          }}
        >
          {label}
        </Searchbar>
      </div>
    );
  }

  return (
    <IconButton ref={iconButtonRef} icon={<SearchIcon />} label="Search" onClick={handleToggle} />
  );
};

Search.defaultProps = {
  trackedEvent: null,
};

Search.propTypes = {
  label: PropTypes.string.isRequired,
  trackedEvent: PropTypes.string,
};

export default Search;
