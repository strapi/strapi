import * as React from 'react';

import { LinkProps } from 'react-router-dom';

import { TranslationMessage } from '../types';

import type { domain } from '@strapi/permissions';

type Permission = domain.permission.Permission;

interface MenuItem extends Pick<LinkProps, 'to'> {
  to: string;
  icon: React.ElementType;
  intlLabel: TranslationMessage;
  /**
   * TODO: add type from the BE for what an Admin Permission looks like –
   * most likely shared throught the helper plugin...? or duplicated, idm.
   */
  permissions: Permission[];
  notificationsCount?: number;
  Component?: React.ComponentType;
}

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

// TODO: this should come from `core/admin/src/core/apis/Plugins`
interface Plugin {
  apis: Record<string, unknown>;
  injectionZones: Record<string, unknown>;
  initializer: React.ComponentType<{ setPlugin(pluginId: string): void }>;
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

export interface StrapiAppContextValue {
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
