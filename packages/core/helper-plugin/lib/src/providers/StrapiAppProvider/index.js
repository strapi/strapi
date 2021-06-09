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
  plugins: PropTypes.object.isRequired,
  runHookParallel: PropTypes.func.isRequired,
  runHookWaterfall: PropTypes.func.isRequired,
  runHookSeries: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
};

export default StrapiAppProvider;
