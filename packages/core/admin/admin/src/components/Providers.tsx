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

import { AuthProvider } from '../features/Auth';

import { GuidedTourProvider } from './GuidedTour/Provider';
import { LanguageProvider, LanguageProviderProps } from './LanguageProvider';
import { Theme, ThemeProps } from './Theme';

import type { Store } from '../core/store/configure';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

interface ProvidersProps
  extends Pick<LanguageProviderProps, 'messages'>,
    Pick<CustomFieldsProviderProps, 'customFields'>,
    Pick<LibraryProviderProps, 'components' | 'fields'>,
    Pick<
      StrapiAppProviderProps,
      | 'getPlugin'
      | 'getAdminInjectedComponents'
      | 'menu'
      | 'plugins'
      | 'runHookParallel'
      | 'runHookSeries'
      | 'runHookWaterfall'
      | 'settings'
    >,
    Pick<ThemeProps, 'themes'> {
  children: React.ReactNode;
  store: Store;
}

const Providers = ({
  children,
  components,
  customFields,
  fields,
  getAdminInjectedComponents,
  getPlugin,
  menu,
  messages,
  plugins,
  runHookParallel,
  runHookSeries,
  runHookWaterfall,
  settings,
  store,
  themes,
}: ProvidersProps) => {
  return (
    <Provider store={store}>
      <AuthProvider>
        <LanguageProvider messages={messages}>
          <Theme themes={themes}>
            <QueryClientProvider client={queryClient}>
              <StrapiAppProvider
                getPlugin={getPlugin}
                getAdminInjectedComponents={getAdminInjectedComponents}
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
            </QueryClientProvider>
          </Theme>
        </LanguageProvider>
      </AuthProvider>
    </Provider>
  );
};

export { Providers };
