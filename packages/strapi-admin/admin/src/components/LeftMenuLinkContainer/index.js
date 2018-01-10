/**
 *
 * LeftMenuLinkContainer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, snakeCase, isEmpty, map, sortBy } from 'lodash';

import LeftMenuLink from 'components/LeftMenuLink';

import styles from './styles.scss';
import messages from './messages.json';

function LeftMenuLinkContainer({ plugins }) {
  const pluginsObject = plugins.toJS();

  // Generate the list of sections
  const pluginsSections = Object.keys(pluginsObject).reduce((acc, current) => {
    pluginsObject[current].leftMenuSections.forEach((section = {}) => {
      if (!isEmpty(section.links)) {
        acc[snakeCase(section.name)] = {
          name: section.name,
          links: get(acc[snakeCase(section.name)], 'links', []).concat(section.links.map(link => {
            link.source = current;
            link.plugin = !isEmpty(pluginsObject[link.plugin]) ? link.plugin : pluginsObject[current].id;

            return link;
          })),
        };
      }
    });

    return acc;
  }, {});

  const linkSections = Object.keys(pluginsSections).map((current, j) => (
    <div key={j}>
      <p className={styles.title}>{pluginsSections[current].name}</p>
      <ul className={styles.list}>
        {sortBy(pluginsSections[current].links, 'label').map((link, i) =>
          <LeftMenuLink key={`${i}-${link.label}`} icon={link.icon || 'link'} label={link.label} destination={`/plugins/${link.plugin}/${link.destination}`} source={link.source} />
        )}
      </ul>
    </div>
  ));

  // Check if the plugins list is empty or not and display plugins by name
  const pluginsLinks = !isEmpty(pluginsObject) ?
    map(sortBy(pluginsObject, 'name'), plugin => {
      if (plugin.id !== 'email' && plugin.id !== 'content-manager') {
        return (
          <LeftMenuLink
            key={get(plugin, 'id')}
            icon={get(plugin, 'icon') || 'plug'}
            label={get(plugin, 'name')}
            destination={`/plugins/${get(plugin, 'id')}`}
          />
        );
      }})
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
            icon="puzzle-piece"
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
