import React, { isValidElement, useState } from 'react';
import PropTypes from 'prop-types';
import { get, isEmpty, isObject } from 'lodash';
import matchSorter from 'match-sorter';
import useFormattedMessage from '../../hooks/useFormattedMessage';
import LeftMenuLink from '../LeftMenuLink';
import LeftMenuSubList from '../LeftMenuSubList';
import LeftMenuHeader from '../LeftMenuHeader';
import List from './List';
import Wrapper from './Wrapper';

function LeftMenuList({ customLink, links, title, searchable }) {
  const [search, setSearch] = useState('');
  const formatTitleWithIntl = title => {
    if (isObject(title) && title.id) {
      return { ...title, defaultMessage: title.defaultMessage || title.id };
    }

    return { id: title, defaultMessage: title };
  };

  const { Component, componentProps } = customLink || {
    Component: null,
    componentProps: {},
  };

  const hasChildObject = () => links.some(link => !isEmpty(link.links));

  const getCount = () => {
    if (hasChildObject()) {
      return links.reduce((acc, current) => {
        return acc + get(current, 'links', []).length;
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
        <LeftMenuLink {...link}>{useFormattedMessage(title)}</LeftMenuLink>
      </li>
    );
  };

  const headerProps = {
    count: getCount(),
    search,
    searchable,
    setSearch,
    title: formatTitleWithIntl(title),
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
