import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isEmpty } from 'lodash';
import matchSorter from 'match-sorter';

import Wrapper from './Wrapper';
import List from './List';
import Search from './Search';

import LeftMenuLink from '../LeftMenuLink';
import LeftMenuSubList from '../LeftMenuSubList';

function LeftMenuList({ customLink, links, title }) {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { Component, componentProps } = customLink;

  const toggleSearch = () => setShowSearch(!showSearch);

  const handleChange = ({ target: { value } }) => {
    setSearch(value);
  };

  const clearSearch = () => {
    setSearch('');
  };

  const hasChildObject = () => {
    return links.find(obj => obj.links);
  };

  const handleClose = () => {
    clearSearch();
    toggleSearch();
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

  const getCount = () => {
    if (hasChildObject()) {
      return links.reduce((acc, current) => {
        return acc + current.links.length;
      }, 0);
    }
    return links.length;
  };

  const getTitle = () =>
    getCount() > 1 ? `${title.id}plural` : `${title.id}singular`;

  const renderCompo = (link, i) => {
    const { links, name, title } = link;

    if (links) {
      const isFiltered = !isEmpty(search) ? true : false;

      return (
        <LeftMenuSubList
          key={name}
          {...link}
          isFiltered={isFiltered}
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
              <i className="fa fa-search"></i>
            </button>
          </div>
        ) : (
          <div className="search-wrapper">
            <i className="fa fa-search"></i>
            <button onClick={toggleSearch}></button>
            <Search
              onChange={handleChange}
              value={search}
              placeholder="search…"
            />
            <button onClick={handleClose}>
              <i className="fa fa-close"></i>
            </button>
          </div>
        )}
      </div>
      <div>
        <List>{getList().map((link, i) => renderCompo(link, i))}</List>
        <Component {...componentProps} />
      </div>
    </Wrapper>
  );
}

LeftMenuList.defaultProps = {
  customLink: {
    Component: null,
    componentProps: {
      id: null,
      onClick: () => {},
    },
  },
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
