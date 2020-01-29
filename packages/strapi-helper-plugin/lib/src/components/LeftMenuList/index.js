import React, { isValidElement, useState } from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import matchSorter from 'match-sorter';

import Wrapper from './Wrapper';
import List from './List';

import LeftMenuLink from '../LeftMenuLink';
import LeftMenuSubList from '../LeftMenuSubList';
import LeftMenuHeader from '../LeftMenuHeader';

function LeftMenuList({ customLink, links, title, searchable }) {
  const [search, setSearch] = useState('');

  const { Component, componentProps } = customLink || {
    Component: null,
    componentProps: {},
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
          links: matchSorter(link.links, search, { keys: ['title'] }),
        };
      });
    }

    return matchSorter(links, search, { keys: ['title'] });
  };

  const renderCompo = (link, i) => {
    const { links, name, title, ...rest } = link;

    if (links) {
      const isSearching = !isEmpty(search);

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

  const headerProps = {
    count: getCount(),
    search,
    searchable,
    setSearch,
    title,
  };

  return (
    <Wrapper>
      <div className="list-header">
        <LeftMenuHeader {...headerProps} />
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
  title: null,
  searchable: false,
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
  title: PropTypes.shape({
    id: PropTypes.string,
  }),
  searchable: PropTypes.bool,
};

export default LeftMenuList;
