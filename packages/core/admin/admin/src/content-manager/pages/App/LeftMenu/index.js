/**
 *
 * LeftMenu
 *
 */

import React, { useMemo, useState } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { useIntl } from 'react-intl';
import matchSorter from 'match-sorter';
import sortBy from 'lodash/sortBy';
import toLower from 'lodash/toLower';
import { NavLink } from 'react-router-dom';
import {
  SubNav,
  SubNavHeader,
  SubNavSection,
  SubNavSections,
  SubNavLink,
} from '@strapi/design-system/v2/SubNav';
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

  const intlCollectionTypeLinks = toIntl(collectionTypeLinks);
  const intlSingleTypeLinks = toIntl(singleTypeLinks);

  const menu = [
    {
      id: 'collectionTypes',
      title: {
        id: getTrad('components.LeftMenu.collection-types'),
        defaultMessage: 'Collection Types',
      },
      searchable: true,
      links: sortBy(matchByTitle(intlCollectionTypeLinks, search), object =>
        object.title.toLowerCase()
      ),
    },
    {
      id: 'singleTypes',
      title: {
        id: getTrad('components.LeftMenu.single-types'),
        defaultMessage: 'Single Types',
      },
      searchable: true,
      links: sortBy(matchByTitle(intlSingleTypeLinks, search), object =>
        object.title.toLowerCase()
      ),
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
                const search = link.search ? `?${link.search}` : '';

                return (
                  <SubNavLink as={NavLink} key={link.uid} to={`${link.to}${search}`}>
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
