import React, { createRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Search from './Search';

function LeftMenuHeader({ count, search, searchable, setSearch, title }) {
  const [showSearch, setShowSearch] = useState(false);

  const ref = createRef();

  useEffect(() => {
    if (showSearch && ref.current) {
      ref.current.focus();
    }
  }, [ref, showSearch]);

  const toggleSearch = () => setShowSearch(!showSearch);

  const getTitle = () => {
    if (searchable) {
      return (
        <FormattedMessage
          id={`${title.id}${count > 1 ? 'plural' : 'singular'}`}
        />
      );
    }

    return <FormattedMessage id={title.id} />;
  };

  const handleClose = () => {
    clearSearch();
    toggleSearch();
  };

  const clearSearch = () => {
    setSearch('');
  };

  const handleChange = ({ target: { value } }) => {
    setSearch(value);
  };

  return !showSearch ? (
    <div className="title-wrapper">
      <h3>
        {getTitle()}
        &nbsp;&nbsp;
        {searchable && (
          <span className="count-info" datadescr={count}>
            {count}
          </span>
        )}
      </h3>
      {searchable && (
        <button onClick={toggleSearch}>
          <FontAwesomeIcon icon="search" />
        </button>
      )}
    </div>
  ) : (
    <div className="search-wrapper">
      <FontAwesomeIcon icon="search" />
      <button onClick={toggleSearch} />
      <Search
        ref={ref}
        onChange={handleChange}
        value={search}
        placeholder="search…"
      />
      <button onClick={handleClose}>
        <FontAwesomeIcon icon="times" />
      </button>
    </div>
  );
}

LeftMenuHeader.defaultProps = {
  count: 0,
  search: null,
  searchable: false,
  setSearch: () => {},
};

LeftMenuHeader.propTypes = {
  count: PropTypes.number,
  title: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  search: PropTypes.string,
  searchable: PropTypes.bool,
  setSearch: PropTypes.func,
};

export default LeftMenuHeader;
