/**
 *
 * StrapiAppProvider
 *
 */
import React from 'react';
import PropTypes from 'prop-types';
import StrapiAppContext from '../../contexts/StrapiAppContext';

const StrapiAppProvider = ({
  children,
  getPlugin,
  menu,
  plugins,
  runHookParallel,
  runHookWaterfall,
  runHookSeries,
  settings,
}) => {
  return (
    <StrapiAppContext.Provider
      value={{
        getPlugin,
        menu,
        plugins,
        runHookParallel,
        runHookWaterfall,
        runHookSeries,
        settings,
      }}
    >
      {children}
    </StrapiAppContext.Provider>
  );
};

StrapiAppProvider.propTypes = {
  children: PropTypes.node.isRequired,
  getPlugin: PropTypes.func.isRequired,
  menu: PropTypes.arrayOf(
    PropTypes.shape({
      to: PropTypes.string.isRequired,
      icon: PropTypes.string,
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
};

export default StrapiAppProvider;
