/**
 *
 * LeftMenu
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { sortBy } from 'lodash';
import { useHistory } from 'react-router-dom';
import { LeftMenuList, useGlobalContext } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';
import CustomLink from '../../components/CustomLink';
import useDataManager from '../../hooks/useDataManager';
import makeSearch from '../../utils/makeSearch';
import Wrapper from './Wrapper';

const displayNotificationCTNotSaved = () => {
  strapi.notification.info(
    `${pluginId}.notification.info.contentType.creating.notSaved`
  );
};

function LeftMenu({ wait }) {
  const {
    components,
    componentsGroupedByCategory,
    contentTypes,
    isInDevelopmentMode,
    sortedContentTypesList,
  } = useDataManager();
  const { formatMessage } = useGlobalContext();
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
          headerDisplayName: data.name,
          headerDisplayCategory: formatMessage({
            id: getTrad('modalForm.header.categories'),
          }),
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
      !Object.keys(contentTypes).some(
        ct => contentTypes[ct].isTemporary === true
      ) &&
      !Object.keys(components).some(
        component => components[component].isTemporary === true
      )
    );
  };

  const handleClickOpenModal = async type => {
    if (canOpenModalCreateCTorComponent()) {
      await wait();
      push({
        search: `modalType=${type}&actionType=create&settingType=base&forTarget=${type}`,
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
                handleClickOpenModal('contentType');
              },
            },
          }
        : null,
      links: sortedContentTypesList,
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
