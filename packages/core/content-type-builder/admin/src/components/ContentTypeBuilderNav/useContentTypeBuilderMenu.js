import { useState } from 'react';
import { useNotification, useTracking } from '@strapi/helper-plugin';
import isEmpty from 'lodash/isEmpty';
import sortBy from 'lodash/sortBy';
import toLower from 'lodash/toLower';
import isEqual from 'lodash/isEqual';
import matchSorter from 'match-sorter';
import useDataManager from '../../hooks/useDataManager';
import useFormModalNavigation from '../../hooks/useFormModalNavigation';
import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';

const useContentTypeBuilderMenu = () => {
  const {
    components,
    componentsGroupedByCategory,
    contentTypes,
    isInDevelopmentMode,
    sortedContentTypesList,
    modifiedData,
    initialData,
  } = useDataManager();
  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const [search, setSearch] = useState('');
  const { onOpenModalCreateSchema, onOpenModalEditCategory } = useFormModalNavigation();

  const componentsData = sortBy(
    Object.keys(componentsGroupedByCategory).map(category => ({
      name: category,
      title: category,
      isEditable: isInDevelopmentMode,
      onClickEdit: (e, data) => {
        e.stopPropagation();

        if (canOpenModalCreateCTorComponent) {
          onOpenModalEditCategory(data.name);
        } else {
          toggleNotificationCannotCreateSchema();
        }
      },
      links: sortBy(
        componentsGroupedByCategory[category].map(compo => ({
          name: compo.uid,
          to: `/plugins/${pluginId}/component-categories/${category}/${compo.uid}`,
          title: compo.schema.displayName,
        })),
        obj => obj.title
      ),
    })),
    obj => obj.title
  );

  const canOpenModalCreateCTorComponent =
    !Object.keys(contentTypes).some(ct => contentTypes[ct].isTemporary === true) &&
    !Object.keys(components).some(component => components[component].isTemporary === true) &&
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
      message: {
        id: `${getTrad('notification.info.creating.notSaved')}`,
        defaultMessage: 'Please save your work before creating a new collection type or component',
      },
    });
  };

  const displayedContentTypes = sortedContentTypesList.filter(obj => obj.visible);

  const data = [
    {
      name: 'models',
      title: {
        id: `${getTrad('menu.section.models.name.plural')}`,
        defaultMessage: 'Collection Types',
      },
      customLink: isInDevelopmentMode && {
        id: `${getTrad('button.model.create')}`,
        defaultMessage: 'Create new collection type',
        onClick: handleClickOpenModalCreateCollectionType,
      },
      links: displayedContentTypes.filter(contentType => contentType.kind === 'collectionType'),
    },
    {
      name: 'singleTypes',
      title: {
        id: `${getTrad('menu.section.single-types.name.plural')}`,
        defaultMessage: 'Single Types',
      },
      customLink: isInDevelopmentMode && {
        id: `${getTrad('button.single-types.create')}`,
        defaultMessage: 'Create new single type',
        onClick: handleClickOpenModalCreateSingleType,
      },
      links: displayedContentTypes.filter(singleType => singleType.kind === 'singleType'),
    },
    {
      name: 'components',
      title: {
        id: `${getTrad('menu.section.components.name.plural')}`,
        defaultMessage: 'Components',
      },
      customLink: isInDevelopmentMode && {
        id: `${getTrad('button.component.create')}`,
        defaultMessage: 'Create a new component',
        onClick: handleClickOpenModalCreateComponent,
      },
      links: componentsData,
    },
  ];

  const matchByTitle = links =>
    matchSorter(links, toLower(search), { keys: [item => toLower(item.title)] });

  const getMenu = () => {
    // Maybe we can do it simpler with matchsorter wildcards ?
    return data.map(section => {
      const hasChild = section.links.some(l => !isEmpty(l.links));

      if (hasChild) {
        return {
          ...section,
          links: section.links.map(l => ({ ...l, links: matchByTitle(l.links) })),
        };
      }

      return {
        ...section,
        links: matchByTitle(section.links),
      };
    });
  };

  return { menu: getMenu(), searchValue: search, onSearchChange: setSearch };
};

export default useContentTypeBuilderMenu;
