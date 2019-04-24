/**
 *
 * LeftMenuLinkContainer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, snakeCase, isEmpty, map, sortBy } from 'lodash';

import LeftMenuLink from '../LeftMenuLink';

import styles from './styles.scss';
import messages from './messages.json';

function LeftMenuLinkContainer({ plugins, ...rest }) {
  // Generate the list of sections
  const pluginsSections = Object.keys(plugins).reduce((acc, current) => {
    plugins[current].leftMenuSections.forEach((section = {}) => {
      if (!isEmpty(section.links)) {
        acc[snakeCase(section.name)] = {
          name: section.name,
          links: get(acc[snakeCase(section.name)], 'links', []).concat(
            section.links.map(link => {
              link.source = current;
              link.plugin = !isEmpty(plugins[link.plugin])
                ? link.plugin
                : plugins[current].id;

              return link;
            }),
          ),
        };
      }
    });

    return acc;
  }, {});

  const linkSections = Object.keys(pluginsSections).map((current, j) => {
    const contentTypes = pluginsSections[current].links;

    return (
      <div key={j}>
        <p className={styles.title}>{pluginsSections[current].name}</p>
        <ul className={styles.list}>
          {sortBy(contentTypes, 'label').map((link, i) => (
            <LeftMenuLink
              {...rest}
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
  const pluginsLinks = !isEmpty(plugins) ? (
    map(sortBy(plugins, 'name'), plugin => {
      if (plugin.id !== 'email' && plugin.id !== 'settings-manager') {
        const basePath = `/plugins/${get(plugin, 'id')}`;
        // NOTE: this should be dynamic
        const destination =
          plugin.id === 'content-manager'
            ? `${basePath}/ctm-configurations`
            : basePath;

        return (
          <LeftMenuLink
            {...rest}
            key={get(plugin, 'id')}
            icon={get(plugin, 'icon') || 'plug'}
            label={get(plugin, 'name')}
            destination={destination}
          />
        );
      }
    })
  ) : (
    <li key="emptyList" className={styles.noPluginsInstalled}>
      <FormattedMessage {...messages.noPluginsInstalled} key="noPlugins" />.
    </li>
  );

  const hasSettingsManager = get(plugins, 'settings-manager', null);
  const staticLinks = [
    {
      icon: 'list',
      label: messages.listPlugins.id,
      destination: '/list-plugins',
    },
    {
      icon: 'shopping-basket',
      label: messages.installNewPlugin.id,
      destination: '/marketplace',
    },
  ];

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
          {staticLinks.map(link => (
            <LeftMenuLink {...rest} key={link.destination} {...link} />
          ))}
          {hasSettingsManager && (
            <LeftMenuLink
              {...rest}
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

LeftMenuLinkContainer.propTypes = {
  plugins: PropTypes.object.isRequired,
};

export default LeftMenuLinkContainer;
