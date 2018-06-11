/**
 *
 * LeftMenuLinkContainer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { findIndex, get, snakeCase, isEmpty, map, sortBy } from 'lodash';

import LeftMenuLink from 'components/LeftMenuLink';

import styles from './styles.scss';
import messages from './messages.json';

function LeftMenuLinkContainer({ layout, plugins }) {
  const pluginsObject = plugins.toJS();
  
  // Generate the list of sections
  const pluginsSections = Object.keys(pluginsObject).reduce((acc, current) => {
    pluginsObject[current].leftMenuSections.forEach((section = {}) => {
      if (!isEmpty(section.links)) {
        acc[snakeCase(section.name)] = {
          name: section.name,
          links: get(acc[snakeCase(section.name)], 'links', []).concat(
            section.links.map(link => {
              link.source = current;
              link.plugin = !isEmpty(pluginsObject[link.plugin])
                ? link.plugin
                : pluginsObject[current].id;

              return link;
            }),
          ),
        };
      }
    });

    return acc;
  }, {});
  
  const linkSections = Object.keys(pluginsSections).map((current, j) => {
    const contentTypesToShow = get(layout, 'layout.contentTypesToShow');
    const contentTypes = contentTypesToShow
      ? pluginsSections[current].links.filter(
        obj => findIndex(contentTypesToShow, ['destination', obj.destination]) !== -1,
      )
      : pluginsSections[current].links;

    return (
      <div key={j}>
        <p className={styles.title}>{pluginsSections[current].name}</p>
        <ul className={styles.list}>
          {sortBy(contentTypes, 'label').map((link, i) => (
            <LeftMenuLink
              key={`${i}-${link.label}`}
              icon={link.icon || 'caret-right'}
              label={link.label}
              destination={`/plugins/${link.plugin}/${link.destination}`}
              source={link.source}
            />
          ))}
        </ul>
      </div>
    );
  });

  // Check if the plugins list is empty or not and display plugins by name
  const pluginsLinks = !isEmpty(pluginsObject) ? (
    map(sortBy(pluginsObject, 'name'), plugin => {
      if (plugin.id !== 'email' && plugin.id !== 'content-manager' && plugin.id !== 'settings-manager') {
        return (
          <LeftMenuLink
            key={get(plugin, 'id')}
            icon={get(plugin, 'icon') || 'plug'}
            label={get(plugin, 'name')}
            destination={`/plugins/${get(plugin, 'id')}`}
          />
        );
      }
    })
  ) : (
    <li className={styles.noPluginsInstalled}>
      <FormattedMessage {...messages.noPluginsInstalled} />.
    </li>
  );

  const hasSettingsManager = get(pluginsObject, 'settings-manager', null);

  return (
    <div className={styles.leftMenuLinkContainer}>
      {linkSections}
      <div>
        <p className={styles.title}>
          <FormattedMessage {...messages.plugins} />
        </p>
        <ul className={styles.list}>{pluginsLinks}</ul>
      </div>
      <div>
        <p className={styles.title}>
          <FormattedMessage {...messages.general} />
        </p>
        <ul className={styles.list}>
          <LeftMenuLink icon="list" label={messages.listPlugins.id} destination="/list-plugins" />
          <LeftMenuLink
            icon="shopping-basket"
            label={messages.installNewPlugin.id}
            destination="/install-plugin"
          />
          {hasSettingsManager && (
            <LeftMenuLink
              icon="gear"
              label={messages.configuration.id}
              destination="/plugins/settings-manager"
            />
          )}
        </ul>
      </div>
    </div>
  );
}

LeftMenuLinkContainer.defaultProps = {
  layout: {},
};

LeftMenuLinkContainer.propTypes = {
  layout: PropTypes.object,
  plugins: PropTypes.object.isRequired,
};

export default LeftMenuLinkContainer;
