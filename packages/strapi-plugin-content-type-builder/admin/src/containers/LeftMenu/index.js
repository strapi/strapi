/**
 *
 * LeftMenu
 *
 */

import React, { useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import { groupBy } from 'lodash';

import { LeftMenuList } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import MenuContext from '../../containers/MenuContext';
import CustomLink from '../../components/CustomLink';
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
        title: {
          id: `${pluginId}.menu.section.models.name.`,
        },
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
        title: {
          id: `${pluginId}.menu.section.components.name.`,
        },
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
        return {
          ...model,
          to: getLinkRoute('models', model),
          title: getLinkTitle(model),
        };
      }),
    ];
  };

  const getComponents = () => {
    // TODO : Replace groupsBy param with category when available
    const componentsObj = groupBy(groups, 'uid');

    return Object.keys(componentsObj).map(key => {
      const links = [
        ...componentsObj[key].map(compo => {
          return {
            ...compo,
            to: getLinkRoute('components', compo, key),
            title: getLinkTitle(compo),
          };
        }),
      ];

      return { name: key, links };
    });
  };

  const notSavedLabel = () => {
    return <FormattedMessage id={`${pluginId}.contentType.temporaryDisplay`} />;
  };

  const getLinkRoute = (param, item, category = null) => {
    const { name, source, uid } = item;

    const cat = category ? `${category}/` : '';
    const base = `/plugins/${pluginId}/${param}/${cat}${uid || name}`;
    const to = source ? `${base}&source=${source}` : base;

    return to;
  };

  const getLinkTitle = item => {
    const { name, isTemporary } = item;
    return (
      <p>
        <span>{name}</span>
        {isTemporary && notSavedLabel()}
      </p>
    );
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
