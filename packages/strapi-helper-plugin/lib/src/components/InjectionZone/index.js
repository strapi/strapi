import React from 'react';
import PropTypes from 'prop-types';
import useStrapi from '../../hooks/useStrapi';

const InjectionZone = ({ area, ...props }) => {
  const { strapi: globalStrapi } = useStrapi();
  const [plugin, page, position] = area.split('.');
  const plugin = globalStrapi.getPlugin(plugin);

  if (!plugin) {
    return null;
  }

  const compos = plugin.getInjectedComponents(page, position);

  return compos.map(compo => <compo.Component key={compo.name} {...props} />);
};

InjectionZone.propTypes = {
  area: PropTypes.string.isRequired,
};

export default InjectionZone;
