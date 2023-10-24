import * as React from 'react';

import {
  AutoReloadOverlayBlockerProvider,
  CustomFieldsProvider,
  CustomFieldsProviderProps,
  LibraryProvider,
  LibraryProviderProps,
  NotificationsProvider,
  OverlayBlockerProvider,
  StrapiAppProvider,
  StrapiAppProviderProps,
} from '@strapi/helper-plugin';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';

import { AdminContext, AdminContextValue } from '../contexts/admin';

import { ConfigurationProvider, ConfigurationProviderProps } from './ConfigurationProvider';
import { GuidedTourProvider } from './GuidedTour/Provider';
import { LanguageProvider, LanguageProviderProps } from './LanguageProvider';
import { Theme } from './Theme';
import { ThemeToggleProvider, ThemeToggleProviderProps } from './ThemeToggleProvider';

import type { Store } from '../core/store/configure';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

interface ProvidersProps
  extends Pick<ThemeToggleProviderProps, 'themes'>,
    Pick<LanguageProviderProps, 'messages' | 'localeNames'>,
    Pick<
      ConfigurationProviderProps,
      'authLogo' | 'menuLogo' | 'showReleaseNotification' | 'showTutorials'
    >,
    Pick<AdminContextValue, 'getAdminInjectedComponents'>,
    Pick<CustomFieldsProviderProps, 'customFields'>,
    Pick<LibraryProviderProps, 'components' | 'fields'>,
    Pick<
      StrapiAppProviderProps,
      | 'getPlugin'
      | 'menu'
      | 'plugins'
      | 'runHookParallel'
      | 'runHookSeries'
      | 'runHookWaterfall'
      | 'settings'
    > {
  children: React.ReactNode;
  store: Store;
}

const Providers = ({
  authLogo,
  children,
  components,
  customFields,
  fields,
  getAdminInjectedComponents,
  getPlugin,
  localeNames,
  menu,
  menuLogo,
  messages,
  plugins,
  runHookParallel,
  runHookSeries,
  runHookWaterfall,
  settings,
  showReleaseNotification,
  showTutorials,
  store,
  themes,
}: ProvidersProps) => {
  return (
    <LanguageProvider messages={messages} localeNames={localeNames}>
      <ThemeToggleProvider themes={themes}>
        <Theme>
          <QueryClientProvider client={queryClient}>
            <Provider store={store}>
              <AdminContext.Provider value={{ getAdminInjectedComponents }}>
                <ConfigurationProvider
                  authLogo={authLogo}
                  menuLogo={menuLogo}
                  showReleaseNotification={showReleaseNotification}
                  showTutorials={showTutorials}
                >
                  <StrapiAppProvider
                    getPlugin={getPlugin}
                    menu={menu}
                    plugins={plugins}
                    runHookParallel={runHookParallel}
                    runHookWaterfall={runHookWaterfall}
                    runHookSeries={runHookSeries}
                    settings={settings}
                  >
                    <LibraryProvider components={components} fields={fields}>
                      <CustomFieldsProvider customFields={customFields}>
                        <AutoReloadOverlayBlockerProvider>
                          <OverlayBlockerProvider>
                            <GuidedTourProvider>
                              <NotificationsProvider>{children}</NotificationsProvider>
                            </GuidedTourProvider>
                          </OverlayBlockerProvider>
                        </AutoReloadOverlayBlockerProvider>
                      </CustomFieldsProvider>
                    </LibraryProvider>
                  </StrapiAppProvider>
                </ConfigurationProvider>
              </AdminContext.Provider>
            </Provider>
          </QueryClientProvider>
        </Theme>
      </ThemeToggleProvider>
    </LanguageProvider>
  );
};

export { Providers };
