/**
 *
 * LeftMenu
 *
 */

import React, { useContext } from 'react';
import { FormattedMessage } from 'react-intl';

import cn from 'classnames';

import pluginId from '../../pluginId';

import CustomLink from '../../components/CustomLink';
import DocumentationSection from '../../components/DocumentationSection';
import MenuContext from '../../containers/MenuContext';
import LeftMenuLink from '../../components/LeftMenuLink';

import StyledLeftMenu from './StyledLeftMenu';

const getSectionTitle = (itemsTitle, count) => {
  const base = `${pluginId}.menu.section.${itemsTitle}.name.`;

  return count > 1 ? `${base}plural` : `${base}singular`;
};

const displayNotificationCTNotSaved = () =>
  strapi.notification.info(
    `${pluginId}.notification.info.contentType.creating.notSaved`
  );

function LeftMenu() {
  const { canOpenModal, groups, models, push } = useContext(MenuContext);

  const handleClickOpenModalCreateCT = type => {
    console.log('YOUYOUY');
    if (canOpenModal) {
      push({
        search: `modalType=${type}&settingType=base&actionType=create`,
      });
    } else {
      displayNotificationCTNotSaved();
    }
  };

  const renderLinks = (param, items) => {
    const links = items.map(item => {
      const { isTemporary, name, source } = item;
      const base = `/plugins/${pluginId}/${param}/${name}`;
      const to = source ? `${base}&source=${source}` : base;

      return (
        <li key={name}>
          <LeftMenuLink
            key={name}
            isTemporary={isTemporary}
            name={name}
            source={source}
            to={to}
          />
        </li>
      );
    });
    return links;
  };

  return (
    <StyledLeftMenu className={cn('col-md-3')}>
      <section>
        <h3>
          <FormattedMessage id={getSectionTitle('models', models.length)} />
        </h3>
        <ul className="menu-list">
          {renderLinks('models', models)}
          <li>
            <CustomLink onClick={() => handleClickOpenModalCreateCT('model')} />
          </li>
        </ul>
      </section>
      <section>
        <h3>
          <FormattedMessage id={getSectionTitle('groups', groups.length)} />
        </h3>
        <ul className="menu-list">
          {renderLinks('groups', groups)}
          <li>
            <CustomLink onClick={() => handleClickOpenModalCreateCT('group')} />
          </li>
        </ul>
      </section>
      <section>
        <h3>
          <FormattedMessage
            id={`${pluginId}.menu.section.documentation.name`}
          />
        </h3>
        <DocumentationSection />
      </section>
    </StyledLeftMenu>
  );
}

export default LeftMenu;
export { getSectionTitle };
