/* eslint-disable react/no-array-index-key */
import React from 'react';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { get, snakeCase, isEmpty } from 'lodash';

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

  const menu = {
    ...contentTypesSections,
  };

  return Object.keys(menu).map(current => (
    <LeftMenuLinkSection
      key={current}
      links={menu[current].links}
      section={current}
      location={location}
      searchable={menu[current].searchable}
      emptyLinksListMessage={menu[current].emptyLinksListMessage}
    />
  ));
};

LeftMenuLinkContainer.propTypes = {
  plugins: PropTypes.object.isRequired,
};

export default LeftMenuLinkContainer;
