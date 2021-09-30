import { useState } from 'react';
import { useNotification, useTracking } from '@strapi/helper-plugin';
import { camelCase, isEmpty, sortBy, toLower, upperFirst } from 'lodash';
import matchSorter from 'match-sorter';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import useDataManager from '../../hooks/useDataManager';
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
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const [search, setSearch] = useState('');

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
          header_label_1: formatMessage({
            id: getTrad('modalForm.header.categories'),
            defaultMessage: 'Categories',
          }),
          header_icon_name_1: 'component',
          header_icon_isCustom_1: false,
          header_info_category_1: null,
          header_info_name_1: null,
          header_label_2: data.name,
          header_icon_name_2: null,
          header_icon_isCustom_2: false,
          header_info_category_2: null,
          header_info_name_2: null,

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

  const canOpenModalCreateCTorComponent = () => {
    return (
      !Object.keys(contentTypes).some(ct => contentTypes[ct].isTemporary === true) &&
      !Object.keys(components).some(component => components[component].isTemporary === true)
    );
  };

  const handleClickOpenModal = async (modalType, kind = '') => {
    const type = kind === 'singleType' ? kind : modalType;

    if (canOpenModalCreateCTorComponent()) {
      trackUsage(`willCreate${upperFirst(camelCase(type))}`);

      const search = makeSearch({
        modalType,
        kind,
        actionType: 'create',
        settingType: 'base',
        forTarget: modalType,
        headerId: getTrad(`modalForm.${type}.header-create`),
        header_icon_isCustom_1: 'false',
        header_icon_name_1: type,
        header_label_1: 'null',
      });
      push({
        search,
      });
    } else {
      toggleNotification({
        type: 'info',
        message: {
          id: `${getTrad('notification.info.creating.notSaved')}`,
          defaultMessage:
            'Please save your work before creating a new collection type or component',
        },
      });
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
        onClick: () => handleClickOpenModal('contentType', 'collectionType'),
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
        onClick: () => handleClickOpenModal('contentType', 'singleType'),
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
        onClick: () => handleClickOpenModal('component'),
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
