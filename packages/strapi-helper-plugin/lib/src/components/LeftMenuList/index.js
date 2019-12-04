import React, { createRef, isValidElement, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isEmpty } from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import matchSorter from 'match-sorter';

import Wrapper from './Wrapper';
import List from './List';
import Search from './Search';

import LeftMenuLink from '../LeftMenuLink';
import LeftMenuSubList from '../LeftMenuSubList';

function LeftMenuList({ customLink, links, title }) {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const ref = createRef();

  useEffect(() => {
    if (showSearch && ref.current) {
      ref.current.focus();
    }
  }, [ref, showSearch]);

  const { Component, componentProps } = customLink || {
    Component: null,
    componentProps: {},
  };

  const toggleSearch = () => setShowSearch(!showSearch);

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

  const hasChildObject = () => links.some(link => !isEmpty(link.links));

  const getCount = () => {
    if (hasChildObject()) {
      return links.reduce((acc, current) => {
        return acc + current.links.length;
      }, 0);
    }
    return links.length;
  };

  const getList = () => {
    if (hasChildObject()) {
      return links.map(link => {
        return {
          ...link,
          links: matchSorter(link.links, search, { keys: ['name'] }),
        };
      });
    }
    return matchSorter(links, search, { keys: ['name'] });
  };

  const getTitle = () =>
    getCount() > 1 ? `${title.id}plural` : `${title.id}singular`;

  const renderCompo = (link, i) => {
    const { links, name, title, ...rest } = link;
    console.log({ link });

    if (links) {
      const isSearching = !isEmpty(search);

      console.log({ links });

      return (
        <LeftMenuSubList
          key={name}
          {...rest}
          {...link}
          isSearching={isSearching}
          isFirstItem={i === 0}
        />
      );
    }

    return (
      <li key={name}>
        <LeftMenuLink {...link}>{title}</LeftMenuLink>
      </li>
    );
  };

  return (
    <Wrapper>
      <div className="list-header">
        {!showSearch ? (
          <div className="title-wrapper">
            <h3>
              <FormattedMessage id={getTitle()} />
              &nbsp;&nbsp;<span>{getCount()}</span>
            </h3>
            <button onClick={toggleSearch}>
              <FontAwesomeIcon icon="search" />
            </button>
          </div>
        ) : (
          <div className="search-wrapper">
            <FontAwesomeIcon icon="search" />
            <button onClick={toggleSearch}></button>
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
        )}
      </div>
      <div>
        <List>{getList().map((link, i) => renderCompo(link, i))}</List>
        {Component && isValidElement(<Component />) && (
          <Component {...componentProps} />
        )}
      </div>
    </Wrapper>
  );
}

LeftMenuList.defaultProps = {
  customLink: null,
  links: [],
  title: 'models',
};

LeftMenuList.propTypes = {
  customLink: PropTypes.shape({
    Component: PropTypes.object,
    componentProps: PropTypes.shape({
      id: PropTypes.string,
      onClick: PropTypes.func,
    }),
  }),
  links: PropTypes.array,
  title: PropTypes.string,
};

export default LeftMenuList;
