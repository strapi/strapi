/**
 *
 * LeftMenuLinkContainer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, isEmpty, map, size, sortBy } from 'lodash';

import LeftMenuLink from 'components/LeftMenuLink';

import styles from './styles.scss';
import messages from './messages.json';

function LeftMenuLinkContainer({ plugins }) {
  // Generate the list of sections
  const linkSections = map(plugins.toJS(), plugin => (
    plugin.leftMenuSections.map((leftMenuSection, j) => {

      if (size(get(leftMenuSection, 'links')) === 0) {
        return <div key="emptyDiv" />;
      }

      return (
        <div key={j}>
          <p className={styles.title}>{leftMenuSection.name}</p>
          <ul className={styles.list}>
            {leftMenuSection.links.map((link) =>
              <LeftMenuLink key={link.label} icon={link.icon || 'link'} label={link.label} destination={`/plugins/${plugin.id}/${link.destination}`} />
            )}
          </ul>
        </div>
      );
    })
  ));

  // Check if the plugins list is empty or not and display plugins by name
  const pluginsLinks = !isEmpty(plugins.toJS()) ?
    map(sortBy(plugins.toJS(), 'name'), plugin => (
      <LeftMenuLink
        key={get(plugin, 'id')}
        icon={get(plugin, 'icon') || 'plug'}
        label={get(plugin, 'name')}
        destination={`/plugins/${get(plugin, 'id')}`}
      />
    ))
    : (
      <li className={styles.noPluginsInstalled}>
        <FormattedMessage {...messages.noPluginsInstalled} />.
      </li>
    );

  return (
    <div className={styles.leftMenuLinkContainer}>
      {linkSections}
      <div>
        <p className={styles.title}><FormattedMessage {...messages.plugins} /></p>
        <ul className={styles.list}>
          {pluginsLinks}
        </ul>
      </div>
      <div>
        <p className={styles.title}><FormattedMessage {...messages.general} /></p>
        <ul className={styles.list}>
          <LeftMenuLink
            icon="cubes"
            label={messages.listPlugins.id}
            destination="/list-plugins"
          />
          <LeftMenuLink
            icon="download"
            label={messages.installNewPlugin.id}
            destination="/install-plugin"
          />
          <LeftMenuLink
            icon="gear"
            label={messages.configuration.id}
            destination="/configuration"
          />
        </ul>
      </div>
    </div>
  );
}

LeftMenuLinkContainer.propTypes = {
  plugins: PropTypes.object.isRequired,
};

export default LeftMenuLinkContainer;
