/**
 *
 * LeftMenu
 *
 */

import React from 'react';
import { sortBy } from 'lodash';
import { useHistory } from 'react-router-dom';
import { LeftMenuList, useGlobalContext } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import CustomLink from '../../components/CustomLink';
import useDataManager from '../../hooks/useDataManager';
import Wrapper from './Wrapper';

const displayNotificationCTNotSaved = () => {
  strapi.notification.info(
    `${pluginId}.notification.info.contentType.creating.notSaved`
  );
};

function LeftMenu() {
  const {
    components,
    componentsGroupedByCategory,
    contentTypes,
    sortedContentTypesList,
  } = useDataManager();
  const { currentEnvironment } = useGlobalContext();
  const { push } = useHistory();
  const isProduction = currentEnvironment === 'production';
  const componentsData = sortBy(
    Object.keys(componentsGroupedByCategory).map(category => ({
      name: category,
      title: category,
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

  const handleClickOpenModal = type => {
    if (canOpenModalCreateCTorComponent()) {
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
      customLink: {
        Component: CustomLink,
        componentProps: {
          disabled: isProduction,
          id: `${pluginId}.button.model.create`,
          onClick: () => {
            handleClickOpenModal('contentType');
          },
        },
      },
      links: sortedContentTypesList,
    },
    {
      name: 'components',
      title: {
        id: `${pluginId}.menu.section.components.name.`,
      },
      searchable: true,
      customLink: {
        Component: CustomLink,
        componentProps: {
          disabled: isProduction,
          id: `${pluginId}.button.component.create`,
          onClick: () => {
            handleClickOpenModal('component');
          },
        },
      },
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

export default LeftMenu;
