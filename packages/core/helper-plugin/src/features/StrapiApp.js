import * as React from 'react';

import PropTypes from 'prop-types';

/**
 * @preserve
 * @typedef {Object} MenuItem
 * @property {string} to
 * @property {React.ComponentType} icon
 * @property {import('react-intl').MessageDescriptor} intlLabel
 * @property {string[]} [permissions]
 * @property {React.ComponentType} [Component]
 */

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

/**
 * TODO: we need to define the type of a `Plugin` & the hook functions
 */

/**
 * @preserve
 * @typedef {Object} StrapiAppContextValue
 * @property {(pluginId: string) => unknown | undefined} getPlugin
 * @property {MenuItem[]} menu
 * @property {Record<string, unknown>} plugins
 * @property {(hookName: string) => Promise<unknown>} runHookParallel
 * @property {(hookName: string) => Promise<unknown>} runHookWaterfall
 * @property {(hookName: string) => Promise<unknown>} runHookSeries
 * @property {Record<string, unknown>} settings
 */

/**
 * @preserve
 * @type {React.Context<StrapiAppContextValue>}
 */
const StrapiAppContext = React.createContext();

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

const StrapiAppProvider = ({
  children,
  getPlugin,
  menu,
  plugins,
  runHookParallel,
  runHookSeries,
  runHookWaterfall,
  settings,
}) => {
  /**
   * @type {StrapiAppContextValue}
   */
  const contextValue = React.useMemo(
    () => ({
      getPlugin,
      menu,
      plugins,
      runHookParallel,
      runHookSeries,
      runHookWaterfall,
      settings,
    }),
    [getPlugin, menu, plugins, runHookParallel, runHookSeries, runHookWaterfall, settings]
  );

  return <StrapiAppContext.Provider value={contextValue}>{children}</StrapiAppContext.Provider>;
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
};

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @returns {StrapiAppContextValue}
 */
const useStrapiApp = () => React.useContext(StrapiAppContext);

export { StrapiAppProvider, useStrapiApp, StrapiAppContext };
