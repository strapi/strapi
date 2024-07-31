import * as React from 'react';

type EmptyObject = Record<string, never>;

type AppInfoContextValue = {
  autoReload?: boolean;
  communityEdition?: boolean;
  currentEnvironment?: string;
  dependencies?: Record<string, string>;
  latestStrapiReleaseTag?: string;
  nodeVersion?: string;
  projectId?: string | null;
  setUserDisplayName: (name: string) => void;
  shouldUpdateStrapi: boolean;
  strapiVersion?: string | null;
  useYarn?: boolean;
  userDisplayName: string;
  userId?: string;
};

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

const AppInfoContext = React.createContext<AppInfoContextValue | EmptyObject>({});

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

type AppInfoProviderProps = AppInfoContextValue & { children: React.ReactNode };

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
}: AppInfoProviderProps) => {
  const contextValue: AppInfoContextValue = React.useMemo(
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

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

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
  AppInfoContext,
  AppInfoProvider,
  AppInfosContext,
  AppInfosProvider,
  useAppInfo,
  useAppInfos,
};

export type { AppInfoContextValue, AppInfoProviderProps };
