import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { SearchIcon } from '@strapi/icons';
import { Searchbar } from '@strapi/parts/Searchbar';
import { IconButton } from '@strapi/parts/IconButton';
import useQueryParams from '../../hooks/useQueryParams';

const Search = ({ label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [{ query }, setQuery] = useQueryParams();
  const [value, setValue] = useState(query?._q || '');
  const { formatMessage } = useIntl();

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

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  if (isOpen) {
    return (
      <Searchbar
        name="search"
        onChange={({ target: { value } }) => setValue(value)}
        onBlur={() => setIsOpen(false)}
        value={value}
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        onClear={() => setQuery({ _q: '' }, 'remove')}
      >
        {label}
      </Searchbar>
    );
  }

  return <IconButton icon={<SearchIcon />} label="Search" onClick={handleToggle} />;
};

Search.propTypes = {
  label: PropTypes.string.isRequired,
};

export default Search;
