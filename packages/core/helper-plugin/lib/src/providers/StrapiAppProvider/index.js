/**
 *
 * StrapiAppProvider
 *
 */
import React from 'react';
import PropTypes from 'prop-types';
import StrapiAppContext from '../../contexts/StrapiAppContext';

const StrapiAppProvider = ({ children, ...value }) => {
  return <StrapiAppContext.Provider value={value}>{children}</StrapiAppContext.Provider>;
};

StrapiAppProvider.propTypes = {
  children: PropTypes.node.isRequired,
  getPlugin: PropTypes.func.isRequired,
  menu: PropTypes.arrayOf(
    PropTypes.shape({
      to: PropTypes.string.isRequired,
      icon: PropTypes.func.isRequired,
      intlLabel: PropTypes.shape({
        id: PropTypes.string.isRequired,
        defaultMessage: PropTypes.string.isRequired,
      }).isRequired,
      permissions: PropTypes.array,
      Component: PropTypes.func,
    })
  ).isRequired,
  plugins: PropTypes.object.isRequired,
  runHookParallel: PropTypes.func.isRequired,
  runHookWaterfall: PropTypes.func.isRequired,
  runHookSeries: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
  getFetchClient: PropTypes.func.isRequired,
};

export default StrapiAppProvider;
