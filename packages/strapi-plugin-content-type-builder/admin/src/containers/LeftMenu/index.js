/**
 *
 * LeftMenu
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { sortBy, camelCase, upperFirst } from 'lodash';
import { useHistory } from 'react-router-dom';
import { LeftMenuList, useGlobalContext } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';
import CustomLink from '../../components/CustomLink';
import useDataManager from '../../hooks/useDataManager';
import makeSearch from '../../utils/makeSearch';
import Wrapper from './Wrapper';

/* eslint-disable indent */

const displayNotificationCTNotSaved = () => {
  strapi.notification.info(`${pluginId}.notification.info.creating.notSaved`);
};

function LeftMenu({ wait }) {
  const {
    components,
    componentsGroupedByCategory,
    contentTypes,
    isInDevelopmentMode,
    sortedContentTypesList,
  } = useDataManager();
  const { emitEvent, formatMessage } = useGlobalContext();
  const { push } = useHistory();
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
      emitEvent(`willCreate${upperFirst(camelCase(type))}`);

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
      displayNotificationCTNotSaved();
    }
  };
  const data = [
    {
      name: 'models',
      title: {
        id: `${pluginId}.menu.section.models.name.`,
      },
      searchable: true,
      customLink: isInDevelopmentMode
        ? {
            Component: CustomLink,
            componentProps: {
              id: `${pluginId}.button.model.create`,
              onClick: () => {
                handleClickOpenModal('contentType', 'collectionType');
              },
            },
          }
        : null,
      links: sortedContentTypesList.filter(contentType => contentType.kind === 'collectionType'),
    },
    {
      name: 'singleTypes',
      title: {
        id: `${pluginId}.menu.section.single-types.name.`,
      },
      searchable: true,
      customLink: isInDevelopmentMode
        ? {
            Component: CustomLink,
            componentProps: {
              id: `${pluginId}.button.single-types.create`,
              onClick: () => {
                handleClickOpenModal('contentType', 'singleType');
              },
            },
          }
        : null,
      links: sortedContentTypesList.filter(singleType => singleType.kind === 'singleType'),
    },
    {
      name: 'components',
      title: {
        id: `${pluginId}.menu.section.components.name.`,
      },
      searchable: true,
      customLink: isInDevelopmentMode
        ? {
            Component: CustomLink,
            componentProps: {
              id: `${pluginId}.button.component.create`,
              onClick: () => {
                handleClickOpenModal('component');
              },
            },
          }
        : null,
      links: componentsData,
    },
  ];

  return (
    <Wrapper className="col-md-3">
      {data.map(list => {
        return <LeftMenuList {...list} key={list.name} />;
      })}
    </Wrapper>
  );
}

LeftMenu.defaultProps = {
  wait: () => {},
};

LeftMenu.propTypes = {
  wait: PropTypes.func,
};

export default LeftMenu;
