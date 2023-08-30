import React from 'react';

import PropTypes from 'prop-types';

import { useStrapiApp } from '../features/StrapiApp';

export const InjectionZone = ({ area, ...props }) => {
  const { getPlugin } = useStrapiApp();
  const [pluginName, page, position] = area.split('.');
  const plugin = getPlugin(pluginName);

  if (!plugin) {
    return null;
  }

  const components = plugin.getInjectedComponents(page, position);

  if (!components) {
    return null;
  }

  return components.map(({ name, Component }) => <Component key={name} {...props} />);
};

InjectionZone.propTypes = {
  area: PropTypes.string.isRequired,
};
