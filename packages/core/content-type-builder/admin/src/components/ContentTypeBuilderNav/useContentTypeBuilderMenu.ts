import { useState, MouseEvent } from 'react';

import { useTracking, useNotification } from '@strapi/admin/strapi-admin';
import { useCollator, useFilter } from '@strapi/design-system';
// import isEqual from 'lodash/isEqual';
import { useIntl } from 'react-intl';

import { pluginId } from '../../pluginId';
import { getTrad } from '../../utils/getTrad';
import { useDataManager } from '../DataManager/useDataManager';
import { useFormModalNavigation } from '../FormModalNavigation/useFormModalNavigation';

// import type { Internal } from '@strapi/types';

export const useContentTypeBuilderMenu = () => {
  const { componentsGroupedByCategory, isInDevelopmentMode, sortedContentTypesList } =
    useDataManager();
  const { trackUsage } = useTracking();
  const [searchValue, setSearchValue] = useState('');
  const { onOpenModalCreateSchema } = useFormModalNavigation();
  const { locale } = useIntl();

  const { startsWith } = useFilter(locale, {
    sensitivity: 'base',
  });

  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const handleClickOpenModalCreateCollectionType = () => {
    // TODO: Review tracking with product
    trackUsage(`willCreateContentType`);

    const nextState = {
      modalType: 'contentType',
      kind: 'collectionType',
      actionType: 'create',
      forTarget: 'contentType',
    };

    onOpenModalCreateSchema(nextState);
  };

  const handleClickOpenModalCreateSingleType = () => {
    trackUsage(`willCreateSingleType`);

    const nextState = {
      modalType: 'contentType',
      kind: 'singleType',
      actionType: 'create',
      forTarget: 'contentType',
    };

    onOpenModalCreateSchema(nextState);
  };

  const handleClickOpenModalCreateComponent = () => {
    trackUsage('willCreateComponent');

    const nextState = {
      modalType: 'component',
      kind: null,
      actionType: 'create',
      forTarget: 'component',
    };

    onOpenModalCreateSchema(nextState);
  };

  const componentsData = Object.entries(componentsGroupedByCategory)
    .map(([category, components]) => ({
      name: category,
      title: category,
      isEditable: isInDevelopmentMode,
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

  const displayedContentTypes = sortedContentTypesList.filter((obj) => obj.visible);

  const data = [
    {
      name: 'models',
      title: {
        id: `${getTrad('menu.section.models.name')}`,
        defaultMessage: 'Collection Types',
      },
      customLink: isInDevelopmentMode
        ? {
            id: `${getTrad('button.model.create')}`,
            defaultMessage: 'Create new collection type',
            onClick: handleClickOpenModalCreateCollectionType,
          }
        : undefined,
      links: displayedContentTypes.filter((contentType) => contentType.kind === 'collectionType'),
    },
    {
      name: 'singleTypes',
      title: {
        id: `${getTrad('menu.section.single-types.name')}`,
        defaultMessage: 'Single Types',
      },
      customLink: isInDevelopmentMode
        ? {
            id: `${getTrad('button.single-types.create')}`,
            defaultMessage: 'Create new single type',
            onClick: handleClickOpenModalCreateSingleType,
          }
        : undefined,
      links: displayedContentTypes.filter((singleType) => singleType.kind === 'singleType'),
    },
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
    const hasChild = section.links.some((l) => Array.isArray(l.links));

    if (hasChild) {
      let filteredLinksCount = 0;

      return {
        ...section,
        links: section.links
          .map((link) => {
            const filteredLinks = link.links.filter((link: any) =>
              startsWith(link.title, searchValue)
            );

            if (filteredLinks.length === 0) {
              return null;
            }

            filteredLinksCount += filteredLinks.length;

            return {
              ...link,
              links: filteredLinks.sort((a: any, b: any) => formatter.compare(a.title, b.title)),
            };
          })
          .filter(Boolean),
        linksCount: filteredLinksCount,
      };
    }

    const filteredLinks = section.links
      .filter((link) => startsWith(link.title, searchValue))
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
