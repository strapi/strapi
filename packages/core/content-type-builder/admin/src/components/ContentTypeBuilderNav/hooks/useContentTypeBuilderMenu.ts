import { useState } from 'react';

import { useCollator, useFilter } from '@strapi/design-system';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';

import { pluginId } from '../../../pluginId';
import { getTrad } from '../../../utils/getTrad';
import { useCTBTracking } from '../../CTBSession/ctbSession';
import { useDataManager } from '../../DataManager/useDataManager';
import { useFormModalNavigation } from '../../FormModalNavigation/useFormModalNavigation';

import type { Status } from '../../../types';
import type { SectionKey } from '../../DataManager/utils/contentStructure';
import type { ContentTypeLink } from '../lib/buildFolderTree';

export type FolderMenuSection = {
  onCreateContentType: () => void;
  links: ContentTypeLink[];
  createTypeLabel: string;
  section: SectionKey;
  sectionId: string;
  title: string;
};

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

export type FlatMenuSection = {
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

export function useContentTypeBuilderMenu() {
  const { componentsGroupedByCategory, isInDevelopmentMode, sortedContentTypesList } =
    useDataManager();
  const { onOpenModalCreateSchema } = useFormModalNavigation();
  const { locale, formatMessage } = useIntl();
  const { trackUsage } = useCTBTracking();

  const [searchValue, setSearchValue] = useState('');

  const { contains } = useFilter(locale, {
    sensitivity: 'base',
  });

  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const handleClickOpenModalCreateCollectionType = () => {
    trackUsage(`willCreateContentType`);

    onOpenModalCreateSchema({
      forTarget: 'contentType',
      modalType: 'contentType',
      kind: 'collectionType',
      actionType: 'create',
    });
  };

  const handleClickOpenModalCreateSingleType = () => {
    trackUsage(`willCreateSingleType`);

    onOpenModalCreateSchema({
      forTarget: 'contentType',
      modalType: 'contentType',
      actionType: 'create',
      kind: 'singleType',
    });
  };

  const handleClickOpenModalCreateComponent = () => {
    trackUsage('willCreateComponent');

    onOpenModalCreateSchema({
      modalType: 'component',
      kind: 'collectionType',
      forTarget: 'component',
      actionType: 'create',
    });
  };

  const sortByTitle = (a: { title: string }, b: { title: string }) => {
    return formatter.compare(a.title, b.title);
  };

  const componentsData = Object.entries(componentsGroupedByCategory)
    .map(([category, components]) => {
      const categoryLinks = components
        .map((component) => ({
          to: `/plugins/${pluginId}/component-categories/${category}/${component.uid}`,
          title: component.info.displayName,
          status: component.status,
          name: component.uid,
        }))
        .sort(sortByTitle);

      return {
        title: upperFirst(category),
        links: categoryLinks,
        name: category,
      };
    })
    .sort(sortByTitle);

  const displayedContentTypes = sortedContentTypesList
    .filter((obj) => obj.visible)
    .map((info) => ({
      status: info.status,
      title: info.title,
      kind: info.kind,
      name: info.name,
      to: info.to,
    }));

  const toContentTypeLink = (
    contentType: (typeof displayedContentTypes)[number]
  ): ContentTypeLink => ({
    status: contentType.status,
    title: contentType.title,
    uid: contentType.name,
    to: contentType.to,
  });

  const folderSections: FolderMenuSection[] = [
    {
      section: 'collectionTypes',
      sectionId: 'models',
      title: formatMessage({
        id: getTrad('menu.section.models.name'),
        defaultMessage: 'Collection Types',
      }),
      links: displayedContentTypes
        .filter((contentType) => contentType.kind === 'collectionType')
        .map(toContentTypeLink),
      createTypeLabel: formatMessage({
        id: getTrad('nav.action.new-collection-type'),
        defaultMessage: 'New Collection-Type',
      }),
      onCreateContentType: handleClickOpenModalCreateCollectionType,
    },
    {
      section: 'singleTypes',
      sectionId: 'singleTypes',
      title: formatMessage({
        id: getTrad('menu.section.single-types.name'),
        defaultMessage: 'Single Types',
      }),
      links: displayedContentTypes
        .filter((contentType) => contentType.kind === 'singleType')
        .map(toContentTypeLink),
      createTypeLabel: formatMessage({
        id: getTrad('nav.action.new-single-type'),
        defaultMessage: 'New Single-Type',
      }),
      onCreateContentType: handleClickOpenModalCreateSingleType,
    },
  ];

  const flatSections: FlatMenuSection[] = [
    {
      name: 'components',
      title: {
        id: `${getTrad('menu.section.components.name')}`,
        defaultMessage: 'Components',
      },
      customLink: isInDevelopmentMode
        ? {
            id: `${getTrad('button.component.create')}`,
            defaultMessage: 'Create a new component',
            onClick: handleClickOpenModalCreateComponent,
          }
        : undefined,
      links: componentsData,
    },
  ].map((section) => {
    const hasChild = section.links.some((l) => 'links' in l && Array.isArray(l.links));

    if (hasChild) {
      let filteredLinksCount = 0;

      const links = section.links.reduce((acc, link) => {
        const filteredLinks =
          'links' in link ? link.links.filter((link) => contains(link.title, searchValue)) : [];

        if (filteredLinks.length === 0) {
          return acc;
        }

        filteredLinksCount += filteredLinks.length;

        acc.push({
          ...link,
          links: filteredLinks.sort(sortByTitle),
        });

        return acc;
      }, [] as SubSection[]);

      return {
        ...section,
        linksCount: filteredLinksCount,
        links: links,
      };
    }

    const filteredLinks = section.links
      .filter((link) => contains(link.title, searchValue))
      .sort(sortByTitle);

    return {
      ...section,
      linksCount: filteredLinks.length,
      links: filteredLinks,
    };
  });

  return {
    folderSections,
    flatSections,
    search: {
      clear: () => setSearchValue(''),
      onChange: setSearchValue,
      value: searchValue,
    },
  };
}
