import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Searchbar, SearchForm } from '@strapi/parts/Searchbar';
import { VisuallyHidden } from '@strapi/parts/VisuallyHidden';
import { useIntl } from 'react-intl';
import { IconButton } from '@strapi/parts/IconButton';
import SearchIcon from '@strapi/icons/SearchIcon';
import { getTrad } from '../../../utils';

const SearchAsset = ({ onSubmit, ...props }) => {
  const [value, setValue] = useState('');
  const { formatMessage } = useIntl();

  const handleSubmit = e => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <SearchForm onSubmit={handleSubmit}>
      <Searchbar
        clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
        placeholder={formatMessage({
          id: getTrad('search.placeholder'),
          defaultMessage: 'e.g: the first dog on the moon',
        })}
        name="search-asset"
        onClear={() => setValue('')}
        value={value}
        onChange={e => setValue(e.target.value)}
        {...props}
      >
        {formatMessage({
          id: getTrad('search.label'),
          defaultMessage: 'Search for an asset',
        })}
      </Searchbar>
      <VisuallyHidden>
        <button type="submit" tabIndex={-1}>
          {formatMessage({ id: 'submit', defaultMessage: 'Submit' })}
        </button>
      </VisuallyHidden>
    </SearchForm>
  );
};

SearchAsset.propTypes = {
  onSubmit: PropTypes.func.isRequired,
};

export const Search = () => {
  const { formatMessage } = useIntl();
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <SearchAsset
        onBlur={() => setExpanded(false)}
        onSubmit={() => console.log('Search submitted')}
      />
    );
  }

  return (
    <IconButton
      onClick={() => setExpanded(true)}
      label={formatMessage({
        id: getTrad('search.label'),
        defaultMessage: 'Search for an asset',
      })}
      icon={<SearchIcon />}
    />
  );
};

SearchAsset.propTypes = {};
