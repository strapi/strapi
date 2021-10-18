import { useState } from 'react';
import { useNotification, useTracking } from '@strapi/helper-plugin';
import isEmpty from 'lodash/isEmpty';
import sortBy from 'lodash/sortBy';
import toLower from 'lodash/toLower';
import matchSorter from 'match-sorter';
import { useHistory } from 'react-router-dom';
import useDataManager from '../../hooks/useDataManager';
import useFormModalNavigation from '../../hooks/useFormModalNavigation';
import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';
import makeSearch from '../../utils/makeSearch';

const useContentTypeBuilderMenu = () => {
  const {
    components,
    componentsGroupedByCategory,
    contentTypes,
    isInDevelopmentMode,
    sortedContentTypesList,
  } = useDataManager();
  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const { push } = useHistory();
  const [search, setSearch] = useState('');
  const { onOpenModal } = useFormModalNavigation();

  const componentsData = sortBy(
    Object.keys(componentsGroupedByCategory).map(category => ({
      name: category,
      title: category,
      isEditable: isInDevelopmentMode,
      onClickEdit: (e, data) => {
        e.stopPropagation();

        const search = makeSearch({
          actionType: 'edit',
          modalType: 'editCategory',
          categoryName: data.name,
          settingType: 'base',
        });

        push({ search });
      },
      links: sortBy(
        componentsGroupedByCategory[category].map(compo => ({
          name: compo.uid,
          to: `/plugins/${pluginId}/component-categories/${category}/${compo.uid}`,
          title: compo.schema.name,
        })),
        obj => obj.title
      ),
    })),
    obj => obj.title
  );

  const canOpenModalCreateCTorComponent =
    !Object.keys(contentTypes).some(ct => contentTypes[ct].isTemporary === true) &&
    !Object.keys(components).some(component => components[component].isTemporary === true);

  const toggleNotificationCannotCreateSchema = () => {
    toggleNotification({
      type: 'info',
      message: {
        id: `${getTrad('notification.info.creating.notSaved')}`,
        defaultMessage: 'Please save your work before creating a new collection type or component',
      },
    });
  };

  const handleClickOpenModalCreateCollectionType = () => {
    if (canOpenModalCreateCTorComponent) {
      trackUsage(`willCreateContentType`);

      const nextState = {
        modalType: 'contentType',
        kind: 'collectionType',
        actionType: 'create',
        settingType: 'base',
        forTarget: 'contentType',
      };

      onOpenModal(nextState);

      // FIXME: to remove
      const search = makeSearch(nextState);

      push({
        search,
      });
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
        settingType: 'base',
        forTarget: 'contentType',
      };

      const search = makeSearch(nextState);

      onOpenModal(nextState);

      push({
        search,
      });
    } else {
      toggleNotificationCannotCreateSchema();
    }
  };

  // FIXME : open modal edit
  // const handleClickOpenModalEditCategory = categoryName => {
  //   if (canOpenModalCreateCTorComponent) {
  //     const search = makeSearch({
  //       actionType: 'edit',
  //       modalType: 'editCategory',
  //       categoryName,
  //       settingType: 'base',
  //     });

  //     push({ search });
  //   } else {
  //     toggleNotificationCannotCreateSchema();
  //   }
  // };

  const handleClickOpenModalCreateComponent = () => {
    if (canOpenModalCreateCTorComponent) {
      trackUsage('willCreateComponent');

      const nextState = {
        modalType: 'component',
        kind: null,
        actionType: 'create',
        settingType: 'base',
        forTarget: 'component',
      };

      onOpenModal(nextState);

      const search = makeSearch(nextState);
      push({
        search,
      });
    } else {
      toggleNotificationCannotCreateSchema();
    }
  };

  const displayedContentTypes = sortedContentTypesList.filter(obj => obj.visible);

  const data = [
    {
      name: 'models',
      title: {
        id: `${getTrad('menu.section.models.name.')}`,
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
        id: `${getTrad('menu.section.single-types.name.')}`,
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
        id: `${getTrad('menu.section.components.name.')}`,
        defaultMessage: 'Components',
      },
      customLink: {
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
