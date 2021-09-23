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

  const toIntl = links =>
    links.map(link => {
      return {
        ...link,
        title: formatMessage({ id: link.title, defaultMessage: link.title }),
      };
    });

  const intlCollectionTypeLinks = toIntl(
    collectionTypeLinks.filter(({ isDisplayed }) => isDisplayed)
  );
  const intlSingleTypeLinks = toIntl(singleTypeLinks.filter(({ isDisplayed }) => isDisplayed));

  const menu = [
    {
      id: 'collectionTypes',
      title: {
        id: getTrad('components.LeftMenu.collection-types'),
        defaultMessage:
          '{number, plural, =0 {Collection Types} one {Collection Type } other {Collection Types}}',
        values: { number: intlCollectionTypeLinks.length },
      },
      searchable: true,
      links: sortBy(matchByTitle(intlCollectionTypeLinks, search), 'title'),
    },
    {
      id: 'singleTypes',
      title: {
        id: getTrad('components.LeftMenu.single-types'),
        defaultMessage:
          '{number, plural, =0 {Single Types} one {Single Type } other {Single Types}}',
        values: { number: intlSingleTypeLinks.length },
      },
      searchable: true,
      links: sortBy(matchByTitle(intlSingleTypeLinks, search), 'title'),
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
    <SubNav ariaLabel={label}>
      <SubNavHeader
        label={label}
        searchable
        value={search}
        onChange={handleChangeSearch}
        onClear={handleClear}
        searchLabel={formatMessage({
          id: 'content-manager.components.LeftMenu.Search.label',
          defaultMessage: 'Search for a content type',
        })}
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
