import * as React from 'react';

import { TranslationMessage } from '../types';

import type { Permission } from '@strapi/permissions';

interface MenuItem {
  to: string;
  icon: React.ComponentType;
  intlLabel: TranslationMessage;
  permissions?: Permission[];
  Component?: React.ComponentType;
}

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

// TODO: this should come from `core/admin/src/core/apis/Plugins`
interface Plugin {
  apis: Record<string, unknown>;
  injectionZones: Record<string, unknown>;
  initializer: ({ setPlugin }: { setPlugin: (pluginId: string) => void }) => null;
  getInjectedComponents: (
    containerName: string,
    blockName: string
  ) => Array<{ name: string; Component: React.ComponentType }>;
  isReady: boolean;
  name: string;
  pluginId: string;
}

interface StrapiAppSettingLink {
  id: string;
  to: string;
  intlLabel: TranslationMessage;
  Component: React.ComponentType;
  permissions: Permission[];
}

interface StrapiAppSetting {
  id: string;
  intlLabel: TranslationMessage;
  links: StrapiAppSettingLink[];
}

type RunHookSeries = (hookName: string, async?: boolean) => unknown | Promise<unknown>;

type RunHookWaterfall = <InitialValue, Store>(
  hookName: string,
  initialValue: InitialValue,
  asynchronous: false | undefined,
  store: Store
) => unknown | Promise<unknown>;

interface StrapiAppContextValue {
  menu: MenuItem[];
  plugins: Record<string, Plugin>;
  settings: Record<string, StrapiAppSetting>;
  getPlugin: (pluginId: string) => Plugin | undefined;
  runHookParallel: (hookName: string) => Promise<unknown>;
  runHookWaterfall: RunHookWaterfall;
  runHookSeries: RunHookSeries;
}

const StrapiAppContext = React.createContext<StrapiAppContextValue>({
  getPlugin: () => undefined,
  menu: [],
  plugins: {},
  settings: {},
  // These functions are required but should not resolve to undefined as they do here
  runHookParallel: () => Promise.resolve(),
  runHookWaterfall: () => Promise.resolve(),
  runHookSeries: () => Promise.resolve(),
});

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

interface StrapiAppProviderProps extends StrapiAppContextValue {
  children: React.ReactNode;
}

const StrapiAppProvider = ({
  children,
  getPlugin,
  menu,
  plugins,
  runHookParallel,
  runHookSeries,
  runHookWaterfall,
  settings,
}: StrapiAppProviderProps) => {
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

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

const useStrapiApp = () => React.useContext(StrapiAppContext);

export { StrapiAppContext, StrapiAppProvider, useStrapiApp };
