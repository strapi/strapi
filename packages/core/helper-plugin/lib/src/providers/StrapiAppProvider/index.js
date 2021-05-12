/**
 *
 * StrapiAppProvider
 *
 */
import React from 'react';
import PropTypes from 'prop-types';
import StrapiAppContext from '../../contexts/StrapiAppContext';

const StrapiAppProvider = ({ children, getPlugin, plugins }) => {
  return (
    <StrapiAppContext.Provider value={{ getPlugin, plugins }}>{children}</StrapiAppContext.Provider>
  );
};

StrapiAppProvider.propTypes = {
  children: PropTypes.node.isRequired,
  getPlugin: PropTypes.func.isRequired,
  plugins: PropTypes.object.isRequired,
};

export default StrapiAppProvider;
