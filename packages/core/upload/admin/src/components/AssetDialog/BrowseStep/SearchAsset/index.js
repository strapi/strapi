import React, { useState, useLayoutEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Searchbar, SearchForm } from '@strapi/design-system/Searchbar';
import { IconButton } from '@strapi/design-system/IconButton';
import SearchIcon from '@strapi/icons/Search';
import getTrad from '../../../../utils/getTrad';

const SearchAsset = ({ onChangeSearch, queryValue }) => {
  const { formatMessage } = useIntl();
  const [isOpen, setIsOpen] = useState(!!queryValue);
  const [value, setValue] = useState(queryValue || '');
  const wrapperRef = useRef(null);

  useLayoutEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        wrapperRef.current.querySelector('input').focus();
      }, 0);
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  const handleClear = () => {
    handleToggle();
    onChangeSearch(null);
  };

  const handleSubmit = e => {
    e.preventDefault();
    e.stopPropagation();

    onChangeSearch(value);
  };

  if (isOpen) {
    return (
      <div ref={wrapperRef}>
        <SearchForm onSubmit={handleSubmit}>
          <Searchbar
            name="search"
            onClear={handleClear}
            onChange={e => setValue(e.target.value)}
            clearLabel={formatMessage({
              id: getTrad('search.clear.label'),
              defaultMessage: 'Clear the search',
            })}
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

  return <IconButton icon={<SearchIcon />} label="Search" onClick={handleToggle} />;
};

SearchAsset.defaultProps = {
  queryValue: null,
};

SearchAsset.propTypes = {
  onChangeSearch: PropTypes.func.isRequired,
  queryValue: PropTypes.string,
};

export default SearchAsset;
