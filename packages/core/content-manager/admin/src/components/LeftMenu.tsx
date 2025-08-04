import * as React from 'react';

import { useQueryParams, SubNav } from '@strapi/admin/strapi-admin';
import { Divider, Flex, TextInput, useCollator, useFilter } from '@strapi/design-system';
import { Cross, Search } from '@strapi/icons';
import { parse, stringify } from 'qs';
import { useIntl } from 'react-intl';

import { useContentTypeSchema } from '../hooks/useContentTypeSchema';
import { useTypedSelector } from '../modules/hooks';
import { getTranslation } from '../utils/translations';

import type { ContentManagerLink } from '../hooks/useContentManagerInitData';

const LeftMenu = () => {
  const [search, setSearch] = React.useState('');
  const [{ query }] = useQueryParams<{ plugins?: object }>();
  const { formatMessage, locale } = useIntl();

  const collectionTypeLinks = useTypedSelector(
    (state) => state['content-manager'].app.collectionTypeLinks
  );

  const singleTypeLinks = useTypedSelector((state) => state['content-manager'].app.singleTypeLinks);
  const { schemas } = useContentTypeSchema();

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
    defaultMessage: 'Content Manager',
  });

  const getPluginsParamsForLink = (link: ContentManagerLink) => {
    const schema = schemas.find((schema) => schema.uid === link.uid);
    const isI18nEnabled = Boolean((schema?.pluginOptions?.i18n as any)?.localized);

    // The search params have the i18n plugin
    if (query.plugins && 'i18n' in query.plugins) {
      // Prepare removal of i18n from the plugins search params
      const { i18n, ...restPlugins } = query.plugins;

      // i18n is not enabled, remove it from the plugins search params
      if (!isI18nEnabled) {
        return restPlugins;
      }

      // i18n is enabled, put the plugins search params back together
      return { i18n, ...restPlugins };
    }

    return query.plugins;
  };

  return (
    <SubNav.Main aria-label={label}>
      <SubNav.Header label={label} />
      <Divider background="neutral150" />
      <Flex padding={5} gap={3} direction={'column'} alignItems={'stretch'}>
        <TextInput
          startAction={<Search fill="neutral500" />}
          value={search}
          onChange={handleChangeSearch}
          aria-label="Search"
          placeholder={formatMessage({
            id: 'content-manager.components.LeftMenu.Search.label',
            defaultMessage: 'Search for a content type',
          })}
          endAction={<Cross onClick={handleClear} fill="neutral500" cursor="pointer" />}
          size="S"
        />
      </Flex>
      <SubNav.Sections>
        {menu.map((section) => {
          return (
            <SubNav.Section key={section.id} label={section.title}>
              {section.links.map((link) => {
                return (
                  <SubNav.Link
                    key={link.uid}
                    to={{
                      pathname: link.to,
                      search: stringify({
                        ...parse(link.search ?? ''),
                        plugins: getPluginsParamsForLink(link),
                      }),
                    }}
                    label={link.title}
                  />
                );
              })}
            </SubNav.Section>
          );
        })}
      </SubNav.Sections>
    </SubNav.Main>
  );
};

export { LeftMenu };
