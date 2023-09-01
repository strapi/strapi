import * as React from 'react';

import { TranslationMessage } from 'types';

interface Permission {
  action: string;
  subject: string | null;
}

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

interface Plugin {
  apis: Record<string, unknown>;
  injectionZones: Record<string, unknown>;
  initializer: ({ setPlugin }: { setPlugin: (pluginId: string) => void }) => null | null;
  isReady: boolean;
  name: string;
  pluginId: string;
}

interface StrapiAppSettingLink {
  id: string;
  to: string;
  intlLabel: TranslationMessage;
  Component: React.ComponentType;
  permissions: Permission[] | [];
}

interface StrapiAppSetting {
  id: string;
  intlLabel: TranslationMessage;
  links: StrapiAppSettingLink[];
}

interface RunHookSeries {
  (hookName: string, asynchronous: true): Promise<unknown>;
  (hookName: string, asynchronous: false | undefined): unknown;
}

interface RunHookWaterfall {
  <InitialValue, Store>(
    hookName: string,
    initialValue: InitialValue,
    asynchronous: false | undefined,
    store: Store
  ): unknown;
  <InitialValue, Store>(
    hookName: string,
    initialValue: InitialValue,
    asynchronous: true,
    store: Store
  ): Promise<unknown>;
}

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
  runHookParallel: () => Promise.resolve(),
  runHookWaterfall: () => Promise.resolve(),
  runHookSeries: () => Promise.resolve(),
  settings: {},
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
