/**
 *
 * LeftMenu
 *
 */

import React, { useMemo, useState } from 'react';
import {
  SubNav,
  SubNavHeader,
  SubNavSection,
  SubNavSections,
  SubNavLink,
} from '@strapi/parts/SubNav';
import { useSelector, shallowEqual } from 'react-redux';
import { useIntl } from 'react-intl';
import matchSorter from 'match-sorter';
import sortBy from 'lodash/sortBy';
import toLower from 'lodash/toLower';
import getTrad from '../../../utils/getTrad';
import { makeSelectModelLinks } from '../selectors';

const matchByTitle = (links, search) =>
  matchSorter(links, toLower(search), { keys: [item => toLower(item.title)] });

const LeftMenu = () => {
  const [search, setSearch] = useState('');
  const { formatMessage } = useIntl();
  const modelLinksSelector = useMemo(makeSelectModelLinks, []);
  const { collectionTypeLinks, singleTypeLinks } = useSelector(
    state => modelLinksSelector(state),
    shallowEqual
  );

  const menu = [
    {
      id: 'collectionTypes',
      title: {
        id: getTrad('components.LeftMenu.collection-types'),
        defaultMessage:
          '{number, plural, =0 {Collection Types} one {Collection Type } other {Collection Types}}',
        values: { number: collectionTypeLinks.length },
      },
      searchable: true,
      links: sortBy(matchByTitle(collectionTypeLinks, search), 'title'),
    },
    {
      id: 'singleTypes',
      title: {
        id: getTrad('components.LeftMenu.single-types'),
        defaultMessage:
          '{number, plural, =0 {Single Types} one {Single Type } other {Single Types}}',
        values: { number: singleTypeLinks.length },
      },
      searchable: true,
      links: sortBy(matchByTitle(singleTypeLinks, search), 'title'),
    },
  ];

  const handleClear = () => {
    setSearch('');
  };

  const handleChangeSearch = ({ target: { value } }) => {
    setSearch(value);
  };

  const label = formatMessage({
    id: getTrad('header.name'),
    defaultMessage: 'Content',
  });

  return (
    <SubNav arialLabel={label}>
      <SubNavHeader
        label={label}
        searchable
        value={search}
        onChange={handleChangeSearch}
        onClear={handleClear}
      />
      <SubNavSections>
        {menu.map(section => {
          const label = formatMessage(
            { id: section.title.id, defaultMessage: section.title.defaultMessage },
            section.title.values
          );

          return (
            <SubNavSection
              key={section.id}
              label={label}
              badgeLabel={section.links.length.toString()}
            >
              {section.links.map(link => {
                return (
                  <SubNavLink key={link.uid} to={`${link.to}?${link.search}`}>
                    {link.title}
                  </SubNavLink>
                );
              })}
            </SubNavSection>
          );
        })}
      </SubNavSections>
    </SubNav>
  );
};

export default LeftMenu;
