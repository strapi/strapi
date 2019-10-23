/**
 *
 * LeftMenu
 *
 */

import React, { useContext } from 'react';
import { groupBy } from 'lodash';

import pluginId from '../../pluginId';

import MenuContext from '../../containers/MenuContext';

import CustomLink from '../../components/CustomLink';
import LeftMenuList from '../../components/LeftMenuList';

import Wrapper from './Wrapper';

const displayNotificationCTNotSaved = () => {
  strapi.notification.info(
    `${pluginId}.notification.info.contentType.creating.notSaved`
  );
};

function LeftMenu() {
  const { canOpenModal, groups, models, push } = useContext(MenuContext);

  const getData = () => {
    const data = [
      {
        name: 'models',
        searchable: true,
        customLink: {
          Component: CustomLink,
          componentProps: {
            id: `${pluginId}.button.model.create`,
            onClick: () => openCreateModal('model'),
          },
        },
        links: getModels(),
      },
      {
        name: 'components',
        searchable: true,
        customLink: {
          Component: CustomLink,
          componentProps: {
            id: `${pluginId}.button.component.create`,
            onClick: () => openCreateModal('group'),
          },
        },
        links: getComponents(),
      },
    ];

    return data;
  };

  const getModels = () => {
    return [
      ...models.map(model => {
        return { ...model, to: model.name };
      }),
    ];
  };

  const getComponents = () => {
    // TODO : Replace groupsBy param with category when available
    const componentsObj = groupBy(groups, 'uid');

    return Object.keys(componentsObj).map(key => {
      const links = [
        ...componentsObj[key].map(compo => {
          return { ...compo, to: `${key}/${compo.name}` };
        }),
      ];

      return { name: key, links };
    });
  };

  const openCreateModal = type => {
    if (canOpenModal) {
      push({
        search: `modalType=${type}&settingType=base&actionType=create`,
      });
    } else {
      displayNotificationCTNotSaved();
    }
  };

  return (
    <Wrapper className="col-md-3">
      {getData().map(list => {
        return <LeftMenuList {...list} key={list.name}></LeftMenuList>;
      })}
    </Wrapper>
  );
}

export default LeftMenu;
