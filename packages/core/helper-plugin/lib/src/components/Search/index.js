import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { SearchIcon } from '@strapi/icons';
import { Searchbar } from '@strapi/parts/Searchbar';
import { IconButton } from '@strapi/parts/IconButton';
import useQueryParams from '../../hooks/useQueryParams';

const Search = ({ label }) => {
  const wrapperRef = useRef(null);
  const iconButtonRef = useRef(null);
  const isMountedRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [{ query }, setQuery] = useQueryParams();
  const [value, setValue] = useState(query?._q || '');
  const { formatMessage } = useIntl();

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
    const handler = setTimeout(() => {
      if (value) {
        setQuery({ _q: value, page: 1 });
      } else {
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
          onChange={({ target: { value } }) => setValue(value)}
          onBlur={() => setIsOpen(false)}
          value={value}
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          onClear={() => setValue('')}
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

Search.propTypes = {
  label: PropTypes.string.isRequired,
};

export default Search;
