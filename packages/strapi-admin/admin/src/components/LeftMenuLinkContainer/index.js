import React from 'react';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { get, snakeCase, isEmpty } from 'lodash';

import { SETTINGS_BASE_URL } from '../../config';
import Wrapper from './Wrapper';
import messages from './messages.json';

import LeftMenuLinkSection from '../LeftMenuLinkSection';

const LeftMenuLinkContainer = ({ plugins }) => {
  const location = useLocation();

  // Generate the list of content types sections
  const contentTypesSections = Object.keys(plugins).reduce((acc, current) => {
    plugins[current].leftMenuSections.forEach((section = {}) => {
      if (!isEmpty(section.links)) {
        acc[snakeCase(section.name)] = {
          name: section.name,
          searchable: true,
          links: get(acc[snakeCase(section.name)], 'links', []).concat(
            section.links
              .filter(link => link.isDisplayed !== false)
              .map(link => {
                link.plugin = !isEmpty(plugins[link.plugin]) ? link.plugin : plugins[current].id;

                return link;
              })
          ),
        };
      }
    });

    return acc;
  }, {});

  // Generate the list of plugin links (plugins without a mainComponent should not appear in the left menu)
  const pluginsLinks = Object.values(plugins)
    .filter(
      plugin => plugin.id !== 'email' && plugin.id !== 'content-manager' && !!plugin.mainComponent
    )
    .map(plugin => {
      const pluginSuffixUrl = plugin.suffixUrl ? plugin.suffixUrl(plugins) : '';

      return {
        icon: get(plugin, 'icon') || 'plug',
        label: get(plugin, 'name'),
        destination: `/plugins/${get(plugin, 'id')}${pluginSuffixUrl}`,
      };
    });

  const menu = {
    ...contentTypesSections,
    plugins: {
      searchable: false,
      name: 'plugins',
      emptyLinksListMessage: messages.noPluginsInstalled.id,
      links: pluginsLinks,
    },
    general: {
      searchable: false,
      name: 'general',
      links: [
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
        {
          icon: 'cog',
          label: messages.settings.id,
          destination: SETTINGS_BASE_URL,
        },
      ],
    },
  };

  return (
    <Wrapper>
      {Object.keys(menu).map(current => (
        <LeftMenuLinkSection
          key={current}
          links={menu[current].links}
          section={current}
          location={location}
          searchable={menu[current].searchable}
          emptyLinksListMessage={menu[current].emptyLinksListMessage}
        />
      ))}
    </Wrapper>
  );
};

LeftMenuLinkContainer.propTypes = {
  plugins: PropTypes.object.isRequired,
};

export default LeftMenuLinkContainer;
