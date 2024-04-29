import * as React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { useCollator, useFilter } from '@strapi/design-system';
import {
  SubNav,
  SubNavHeader,
  SubNavLink,
  SubNavSection,
  SubNavSections,
} from '@strapi/design-system';
import { parse, stringify } from 'qs';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { useTypedSelector } from '../modules/hooks';
import { getTranslation } from '../utils/translations';

const LeftMenu = () => {
  const [search, setSearch] = React.useState('');
  const [{ query }] = useQueryParams<{ plugins?: object }>();
  const { formatMessage, locale } = useIntl();
  const collectionTypeLinks = useTypedSelector(
    (state) => state['content-manager'].app.collectionTypeLinks
  );
  const singleTypeLinks = useTypedSelector((state) => state['content-manager'].app.singleTypeLinks);

  const { startsWith } = useFilter(locale, {
    sensitivity: 'base',
  });

  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const menu = React.useMemo(
    () =>
      [
        {
          id: 'collectionTypes',
          title: formatMessage({
            id: getTranslation('components.LeftMenu.collection-types'),
            defaultMessage: 'Collection Types',
          }),
          searchable: true,
          links: collectionTypeLinks,
        },
        {
          id: 'singleTypes',
          title: formatMessage({
            id: getTranslation('components.LeftMenu.single-types'),
            defaultMessage: 'Single Types',
          }),
          searchable: true,
          links: singleTypeLinks,
        },
      ].map((section) => ({
        ...section,
        links: section.links
          /**
           * Filter by the search value
           */
          .filter((link) => startsWith(link.title, search))
          /**
           * Sort correctly using the language
           */
          .sort((a, b) => formatter.compare(a.title, b.title))
          /**
           * Apply the formated strings to the links from react-intl
           */
          .map((link) => {
            return {
              ...link,
              title: formatMessage({ id: link.title, defaultMessage: link.title }),
            };
          }),
      })),
    [collectionTypeLinks, search, singleTypeLinks, startsWith, formatMessage, formatter]
  );

  const handleClear = () => {
    setSearch('');
  };

  const handleChangeSearch = ({ target: { value } }: { target: { value: string } }) => {
    setSearch(value);
  };

  const label = formatMessage({
    id: getTranslation('header.name'),
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
        {menu.map((section) => {
          return (
            <SubNavSection
              key={section.id}
              label={section.title}
              badgeLabel={section.links.length.toString()}
            >
              {section.links.map((link) => {
                return (
                  <SubNavLink
                    as={NavLink}
                    key={link.uid}
                    // @ts-expect-error – DS inference does not work with the `as` prop.
                    to={{
                      pathname: link.to,
                      /**
                       * We re-add the plugins query to the params available in the menu,
                       * this means once you've changed the locale in the app, you continue
                       * to see the same locale when changing content-type.
                       *
                       * NOTE: if you go to a content-type that does not have i18n enabled,
                       * we return the default documents anyway.
                       */
                      search: stringify({
                        ...parse(link.search ?? ''),
                        plugins: query.plugins,
                      }),
                    }}
                  >
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

export { LeftMenu };
