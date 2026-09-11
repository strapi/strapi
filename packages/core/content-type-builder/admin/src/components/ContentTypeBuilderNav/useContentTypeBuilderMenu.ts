import { useState } from 'react';

import { useCollator, useFilter } from '@strapi/design-system';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';

import { pluginId } from '../../pluginId';
import { getTrad } from '../../utils/getTrad';
import { useDataManager } from '../DataManager/useDataManager';

import type { Status } from '../../types';

type Link = {
  name: string;
  to: string;
  status: Status;
  title: string;
};

type SubSection = {
  name: string;
  title: string;
  links: Link[];
};

type MenuSection = {
  name: string;
  title: {
    id: string;
    defaultMessage: string;
  };
  customLink?: {
    id: string;
    defaultMessage: string;
    onClick: () => void;
  };
  links: Array<SubSection | Link>;
  linksCount?: number;
};

type Menu = MenuSection[];

export const useContentTypeBuilderMenu = () => {
  const { componentsGroupedByCategory, sortedContentTypesList } = useDataManager();
  const [searchValue, setSearchValue] = useState('');
  const { locale } = useIntl();

  const { contains } = useFilter(locale, {
    sensitivity: 'base',
  });

  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const componentsData = Object.entries(componentsGroupedByCategory)
    .map(([category, components]) => ({
      name: category,
      title: upperFirst(category),
      links: components
        .map((component) => ({
          name: component.uid,
          to: `/plugins/${pluginId}/component-categories/${category}/${component.uid}`,
          title: component.info.displayName,
          status: component.status,
        }))
        .sort((a, b) => formatter.compare(a.title, b.title)),
    }))
    .sort((a, b) => formatter.compare(a.title, b.title));

  const displayedContentTypes = sortedContentTypesList
    .filter((obj) => obj.visible)
    .map((info) => ({
      kind: info.kind,
      name: info.name,
      to: info.to,
      title: info.title,
      status: info.status,
    }));

  const data: Menu = [
    {
      name: 'models',
      title: {
        id: `${getTrad('menu.section.models.name')}`,
        defaultMessage: 'Collection Types',
      },
      links: displayedContentTypes.filter((contentType) => contentType.kind === 'collectionType'),
    },
    {
      name: 'singleTypes',
      title: {
        id: `${getTrad('menu.section.single-types.name')}`,
        defaultMessage: 'Single Types',
      },
      links: displayedContentTypes.filter((singleType) => singleType.kind === 'singleType'),
    },
    {
      name: 'components',
      title: {
        id: `${getTrad('menu.section.components.name')}`,
        defaultMessage: 'Components',
      },
      links: componentsData,
    },
  ].map((section) => {
    const hasChild = section.links.some((l) => 'links' in l && Array.isArray(l.links));

    if (hasChild) {
      let filteredLinksCount = 0;

      return {
        ...section,
        links: section.links.reduce((acc, link) => {
          const filteredLinks =
            'links' in link ? link.links.filter((link) => contains(link.title, searchValue)) : [];

          if (filteredLinks.length === 0) {
            return acc;
          }

          filteredLinksCount += filteredLinks.length;

          acc.push({
            ...link,
            links: filteredLinks.sort((a, b) => formatter.compare(a.title, b.title)),
          });

          return acc;
        }, [] as SubSection[]),
        linksCount: filteredLinksCount,
      };
    }

    const filteredLinks = section.links
      .filter((link) => contains(link.title, searchValue))
      .sort((a, b) => formatter.compare(a.title, b.title));

    return {
      ...section,
      links: filteredLinks,
      linksCount: filteredLinks.length,
    };
  });

  return {
    menu: data,
    search: {
      value: searchValue,
      onChange: setSearchValue,
      clear: () => setSearchValue(''),
    },
  };
};
