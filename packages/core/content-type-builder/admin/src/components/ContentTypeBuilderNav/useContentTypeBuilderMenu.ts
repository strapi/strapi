import { useState, MouseEvent } from 'react';

import { useTracking, useNotification } from '@strapi/admin/strapi-admin';
import { useCollator, useFilter } from '@strapi/design-system';
import isEqual from 'lodash/isEqual';
import { useIntl } from 'react-intl';

import { useDataManager } from '../../hooks/useDataManager';
import { useFormModalNavigation } from '../../hooks/useFormModalNavigation';
import { pluginId } from '../../pluginId';
import { getTrad } from '../../utils/getTrad';

import type { Internal } from '@strapi/types';

export const useContentTypeBuilderMenu = () => {
  const {
    components,
    componentsGroupedByCategory,
    contentTypes,
    isInDevelopmentMode,
    sortedContentTypesList,
    modifiedData,
    initialData,
  } = useDataManager();
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [search, setSearch] = useState('');
  const { onOpenModalCreateSchema, onOpenModalEditCategory } = useFormModalNavigation();
  const { locale } = useIntl();

  const { startsWith } = useFilter(locale, {
    sensitivity: 'base',
  });

  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const canOpenModalCreateCTorComponent =
    !Object.keys(contentTypes).some((ct) => contentTypes[ct].isTemporary === true) &&
    !Object.keys(components).some(
      (component) => components[component as Internal.UID.Component].isTemporary === true
    ) &&
    isEqual(modifiedData, initialData);

  const handleClickOpenModalCreateCollectionType = () => {
    if (canOpenModalCreateCTorComponent) {
      trackUsage(`willCreateContentType`);

      const nextState = {
        modalType: 'contentType',
        kind: 'collectionType',
        actionType: 'create',
        forTarget: 'contentType',
      };

      onOpenModalCreateSchema(nextState);
    } else {
      toggleNotificationCannotCreateSchema();
    }
  };

  const handleClickOpenModalCreateSingleType = () => {
    if (canOpenModalCreateCTorComponent) {
      trackUsage(`willCreateSingleType`);

      const nextState = {
        modalType: 'contentType',
        kind: 'singleType',
        actionType: 'create',
        forTarget: 'contentType',
      };

      onOpenModalCreateSchema(nextState);
    } else {
      toggleNotificationCannotCreateSchema();
    }
  };

  const handleClickOpenModalCreateComponent = () => {
    if (canOpenModalCreateCTorComponent) {
      trackUsage('willCreateComponent');

      const nextState = {
        modalType: 'component',
        kind: null,
        actionType: 'create',
        forTarget: 'component',
      };

      onOpenModalCreateSchema(nextState);
    } else {
      toggleNotificationCannotCreateSchema();
    }
  };

  const toggleNotificationCannotCreateSchema = () => {
    toggleNotification({
      type: 'info',
      message: formatMessage({
        id: getTrad('notification.info.creating.notSaved'),
        defaultMessage: 'Please save your work before creating a new collection type or component',
      }),
    });
  };

  const componentsData = Object.entries(componentsGroupedByCategory)
    .map(([category, components]) => ({
      name: category,
      title: category,
      isEditable: isInDevelopmentMode,
      onClickEdit(e: MouseEvent, data: any) {
        e.stopPropagation();

        if (canOpenModalCreateCTorComponent) {
          onOpenModalEditCategory(data.name);
        } else {
          toggleNotificationCannotCreateSchema();
        }
      },
      links: components
        .map((component) => ({
          name: component.uid,
          to: `/plugins/${pluginId}/component-categories/${category}/${component.uid}`,
          title: component.schema.displayName,
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
      customLink: isInDevelopmentMode && {
        id: `${getTrad('button.model.create')}`,
        defaultMessage: 'Create new collection type',
        onClick: handleClickOpenModalCreateCollectionType,
      },
      links: displayedContentTypes.filter((contentType) => contentType.kind === 'collectionType'),
    },
    {
      name: 'singleTypes',
      title: {
        id: `${getTrad('menu.section.single-types.name')}`,
        defaultMessage: 'Single Types',
      },
      customLink: isInDevelopmentMode && {
        id: `${getTrad('button.single-types.create')}`,
        defaultMessage: 'Create new single type',
        onClick: handleClickOpenModalCreateSingleType,
      },
      links: displayedContentTypes.filter((singleType) => singleType.kind === 'singleType'),
    },
    {
      name: 'components',
      title: {
        id: `${getTrad('menu.section.components.name')}`,
        defaultMessage: 'Components',
      },
      customLink: isInDevelopmentMode && {
        id: `${getTrad('button.component.create')}`,
        defaultMessage: 'Create a new component',
        onClick: handleClickOpenModalCreateComponent,
      },
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
            const filteredLinks = link.links.filter((link: any) => startsWith(link.title, search));

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
      .filter((link) => startsWith(link.title, search))
      .sort((a, b) => formatter.compare(a.title, b.title));

    return {
      ...section,
      links: filteredLinks,
      linksCount: filteredLinks.length,
    };
  });

  return {
    menu: data,
    searchValue: search,
    onSearchChange: setSearch,
  };
};
