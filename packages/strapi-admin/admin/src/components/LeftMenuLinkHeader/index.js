import React, { useState, createRef, useEffect } from 'react';
import { camelCase } from 'lodash';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import messages from '../LeftMenuLinkContainer/messages.json';
import Search from './Search';

const Title = styled.div`
  display: flex;
  justify-content: space-between;
  padding-left: 2rem;
  padding-right: 1.6rem;
  padding-top: 0.7rem;
  margin-bottom: 0.8rem;
  color: ${props => props.theme.main.colors.leftMenu['title-color']};
  text-transform: uppercase;
  font-size: 1.1rem;
  letter-spacing: 0.1rem;
  font-weight: 800;
`;
const SearchButton = styled.button`
  padding: 0 10px;
`;

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

  return !showSearch ? (
    <Title>
      <FormattedMessage id={id} defaultMessage={defaultMessage} />
      {searchable && (
        <SearchButton onClick={toggleSearch}>
          <FontAwesomeIcon icon="search" />
        </SearchButton>
      )}
    </Title>
  ) : (
    <Title>
      <div>
        <FontAwesomeIcon icon="search" />
      </div>
      <Search
        ref={ref}
        onChange={handleChange}
        value={search}
        placeholder="search…"
      />
      <SearchButton onClick={clearSearch}>
        <FontAwesomeIcon icon="times" />
      </SearchButton>
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
