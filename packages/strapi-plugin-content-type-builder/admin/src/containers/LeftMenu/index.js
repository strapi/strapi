/**
 *
 * LeftMenu
 *
 */

import React from 'react';
import { groupBy } from 'lodash';

import { LeftMenuList } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import CustomLink from '../../components/CustomLink';
import useDataManager from '../../hooks/useDataManager';
import Wrapper from './Wrapper';

// const displayNotificationCTNotSaved = () => {
//   strapi.notification.info(
//     `${pluginId}.notification.info.contentType.creating.notSaved`
//   );
// };

function LeftMenu() {
  const { components, contentTypes } = useDataManager();
  const grouped = groupBy(components, 'category');
  const componentsData = Object.keys(grouped).map(category => ({
    name: category,
    title: category,
    links: grouped[category].map(compo => ({
      name: compo.uid,
      to: `/plugins/${pluginId}/component-categories/${category}/${compo.uid}`,
      title: compo.schema.name,
    })),
  }));

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
          onClick: () => {},
        },
      },
      links: Object.keys(contentTypes).map(uid => ({
        name: uid,
        title: contentTypes[uid].schema.name,
        to: `/plugins/${pluginId}/content-types/${uid}`,
      })),
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
          onClick: () => {},
        },
      },
      links: componentsData,
    },
  ];

  return (
    <Wrapper className="col-md-3">
      {data.map(list => {
        return <LeftMenuList {...list} key={list.name}></LeftMenuList>;
      })}
    </Wrapper>
  );
}

export default LeftMenu;
