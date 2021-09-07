import { Text } from '@buffetjs/core';
import { useNotification, useTracking } from '@strapi/helper-plugin';
import { camelCase, isEmpty, sortBy, toLower, upperFirst } from 'lodash';
import matchSorter from 'match-sorter';
import React, { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import useDataManager from '../../hooks/useDataManager';
import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';
import makeSearch from '../../utils/makeSearch';

const useContentTypeBuilderMenu = ({ wait }) => {
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

      await wait();
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
        message: { id: `${pluginId}.notification.info.creating.notSaved` },
      });
    }
  };

  const displayedContentTypes = useMemo(() => {
    return sortedContentTypesList
      .filter(obj => obj.visible)
      .map(obj => {
        if (obj.plugin) {
          return {
            ...obj,
            CustomComponent: () => (
              <p style={{ justifyContent: 'normal' }}>
                {obj.title}&nbsp;
                <Text
                  as="span"
                  ellipsis
                  // This is needed here
                  style={{ fontStyle: 'italic' }}
                  fontWeight="inherit"
                  lineHeight="inherit"
                >
                  ({formatMessage({ id: getTrad('from') })}: {obj.plugin})&nbsp;
                </Text>
              </p>
            ),
          };
        }

        return obj;
      });
  }, [sortedContentTypesList, formatMessage]);

  const data = [
    {
      name: 'models',
      title: {
        id: `${pluginId}.menu.section.models.name.`,
      },
      customLink: isInDevelopmentMode && {
        id: `${pluginId}.button.model.create`,
        onClick: () => handleClickOpenModal('contentType', 'collectionType'),
      },
      links: displayedContentTypes.filter(contentType => contentType.kind === 'collectionType'),
    },
    {
      name: 'singleTypes',
      title: {
        id: `${pluginId}.menu.section.single-types.name.`,
      },
      customLink: isInDevelopmentMode && {
        id: `${pluginId}.button.single-types.create`,
        onClick: () => handleClickOpenModal('contentType', 'singleType'),
      },
      links: displayedContentTypes.filter(singleType => singleType.kind === 'singleType'),
    },
    {
      name: 'components',
      title: {
        id: `${pluginId}.menu.section.components.name.`,
      },
      customLink: {
        id: `${pluginId}.button.component.create`,
        onClick: () => handleClickOpenModal('component'),
      },
      links: componentsData,
    },
  ];

  const matchByTitle = links =>
    matchSorter(links, toLower(search), { keys: [item => toLower(item.title)] });

  const getMenu = () => {
    // Maybe we can do it simpler with matchsorter wildcards ?
    return data
      .map(section => {
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
      })
      .filter(section => {
        const hasChildren = section.links.every(l => l.links);

        if (hasChildren) {
          return section.links.some(l => l.links.length);
        }

        return section.links.length;
      });
  };

  return { menu: getMenu(), searchValue: search, onSearchChange: setSearch };
};

export default useContentTypeBuilderMenu;
