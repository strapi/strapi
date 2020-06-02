import React, { useState, createRef, useEffect } from 'react';
import { camelCase } from 'lodash';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import messages from '../LeftMenuLinkContainer/messages.json';
import Search from './Search';
import Title from './Title';
import SearchButton from './SearchButton';
import SearchWrapper from './SearchWrapper';

const LeftMenuLinkHeader = ({ section, searchable, setSearch, search }) => {
  const [showSearch, setShowSearch] = useState(false);
  const ref = createRef();
  const { id, defaultMessage } = messages[camelCase(section)];

  useEffect(() => {
    if (showSearch && ref.current) {
      ref.current.focus();
    }
  }, [ref, showSearch]);

  const toggleSearch = () => {
    setShowSearch(prev => !prev);
  };

  const handleChange = ({ target: { value } }) => {
    setSearch(value);
  };

  const clearSearch = () => {
    setSearch('');
    setShowSearch(false);
  };

  return (
    <Title>
      {!showSearch ? (
        <>
          <FormattedMessage id={id} defaultMessage={defaultMessage} />
          {searchable && (
            <SearchButton onClick={toggleSearch}>
              <FontAwesomeIcon icon="search" />
            </SearchButton>
          )}
        </>
      ) : (
        <SearchWrapper>
          <div>
            <FontAwesomeIcon style={{ fontSize: 12 }} icon="search" />
          </div>
          <FormattedMessage id="components.Search.placeholder">
            {message => (
              <Search ref={ref} onChange={handleChange} value={search} placeholder={message} />
            )}
          </FormattedMessage>
          <SearchButton onClick={clearSearch}>
            <FontAwesomeIcon icon="times" />
          </SearchButton>
        </SearchWrapper>
      )}
    </Title>
  );
};

LeftMenuLinkHeader.propTypes = {
  section: PropTypes.string.isRequired,
  searchable: PropTypes.bool,
  setSearch: PropTypes.func,
  search: PropTypes.string,
};

LeftMenuLinkHeader.defaultProps = {
  search: null,
  searchable: false,
  setSearch: () => {},
};

export default LeftMenuLinkHeader;
