import * as React from 'react';

import PropTypes from 'prop-types';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

/**
 * TODO: review this type, do we need to it all?
 */

/**
 * @preserve
 * @typedef {Object} AppInfoContextValue
 * @property {boolean | undefined} autoReload
 * @property {boolean | undefined} communityEdition
 * @property {string | undefined} currentEnvironment
 * @property {Record<string, string>} dependencies
 * @property {string | null} latestStrapiReleaseTag
 * @property {string | undefined} nodeVersion
 * @property {string | undefined} projectId
 * @property {(name: string) => void} setUserDisplayName
 * @property {boolean} shouldUpdateStrapi
 * @property {string | undefined} strapiVersion
 * @property {boolean | undefined} useYarn
 * @property {string} userDisplayName
 * @property {string | null} userId
 *
 */

/**
 * @preserve
 * @type {React.Context<AppInfoContextValue>}
 */
const AppInfoContext = React.createContext();

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

const AppInfoProvider = ({
  children,
  autoReload,
  communityEdition,
  currentEnvironment,
  dependencies,
  latestStrapiReleaseTag,
  nodeVersion,
  projectId,
  setUserDisplayName,
  shouldUpdateStrapi,
  strapiVersion,
  useYarn,
  userDisplayName,
  userId,
}) => {
  /**
   * @type {AppInfoContextValue}
   */
  const contextValue = React.useMemo(
    () => ({
      autoReload,
      communityEdition,
      currentEnvironment,
      dependencies,
      latestStrapiReleaseTag,
      nodeVersion,
      projectId,
      setUserDisplayName,
      shouldUpdateStrapi,
      strapiVersion,
      useYarn,
      userDisplayName,
      userId,
    }),
    [
      autoReload,
      communityEdition,
      currentEnvironment,
      dependencies,
      latestStrapiReleaseTag,
      nodeVersion,
      projectId,
      setUserDisplayName,
      shouldUpdateStrapi,
      strapiVersion,
      useYarn,
      userDisplayName,
      userId,
    ]
  );

  return <AppInfoContext.Provider value={contextValue}>{children}</AppInfoContext.Provider>;
};

AppInfoProvider.defaultProps = {
  autoReload: undefined,
  communityEdition: undefined,
  currentEnvironment: undefined,
  dependencies: undefined,
  latestStrapiReleaseTag: undefined,
  nodeVersion: undefined,
  projectId: undefined,
  strapiVersion: undefined,
  useYarn: undefined,
  userId: null,
};

AppInfoProvider.propTypes = {
  children: PropTypes.node.isRequired,
  autoReload: PropTypes.bool,
  communityEdition: PropTypes.bool,
  currentEnvironment: PropTypes.string,
  dependencies: PropTypes.object,
  latestStrapiReleaseTag: PropTypes.string,
  nodeVersion: PropTypes.string,
  projectId: PropTypes.string,
  setUserDisplayName: PropTypes.func.isRequired,
  shouldUpdateStrapi: PropTypes.bool.isRequired,
  strapiVersion: PropTypes.string,
  useYarn: PropTypes.bool,
  userDisplayName: PropTypes.string.isRequired,
  userId: PropTypes.string,
};

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @returns {AppInfoContextValue}
 */
const useAppInfo = () => React.useContext(AppInfoContext);

/**
 * TODO: rename these to remove the plural in next major version
 */
/**
 * @preserve
 * @deprecated use useAppInfo instead
 */
const useAppInfos = useAppInfo;
/**
 * @preserve
 * @deprecated use AppInfoProvider instead
 */
const AppInfosProvider = AppInfoProvider;
/**
 * @preserve
 * @deprecated use AppInfoContext instead
 */
const AppInfosContext = AppInfoContext;

export {
  AppInfoProvider,
  AppInfoContext,
  useAppInfo,
  useAppInfos,
  AppInfosProvider,
  AppInfosContext,
};
