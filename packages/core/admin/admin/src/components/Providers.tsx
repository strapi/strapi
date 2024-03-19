import * as React from 'react';

import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';

import { AuthProvider } from '../features/Auth';
import { HistoryProvider } from '../features/BackButton';
import { ConfigurationProvider } from '../features/Configuration';
import { NotificationsProvider } from '../features/Notifications';
import { StrapiAppProvider } from '../features/StrapiApp';
import { TrackingProvider } from '../features/Tracking';

import { GuidedTourProvider } from './GuidedTour/Provider';
import { LanguageProvider } from './LanguageProvider';
import { Theme } from './Theme';

import type { Store } from '../core/store/configure';
import type { StrapiApp } from '../StrapiApp';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
  strapi: StrapiApp;
  store: Store;
}

const Providers = ({ children, strapi, store }: ProvidersProps) => {
  return (
    <Provider store={store}>
      <HistoryProvider>
        <AuthProvider>
          <LanguageProvider messages={strapi.configurations.translations}>
            <Theme themes={strapi.configurations.themes}>
              <QueryClientProvider client={queryClient}>
                <StrapiAppProvider
                  components={strapi.library.components}
                  customFields={strapi.customFields}
                  fields={strapi.library.fields}
                  menu={strapi.menu}
                  getAdminInjectedComponents={strapi.getAdminInjectedComponents}
                  getPlugin={strapi.getPlugin}
                  plugins={strapi.plugins}
                  runHookParallel={strapi.runHookParallel}
                  runHookWaterfall={(name, initialValue) => {
                    return strapi.runHookWaterfall(name, initialValue, store);
                  }}
                  runHookSeries={strapi.runHookSeries}
                  settings={strapi.settings}
                >
                  <NotificationsProvider>
                    <TrackingProvider>
                      <GuidedTourProvider>
                        <ConfigurationProvider
                          defaultAuthLogo={strapi.configurations.authLogo}
                          defaultMenuLogo={strapi.configurations.menuLogo}
                          showTutorials={strapi.configurations.tutorials}
                          showReleaseNotification={strapi.configurations.notifications.releases}
                        >
                          {children}
                        </ConfigurationProvider>
                      </GuidedTourProvider>
                    </TrackingProvider>
                  </NotificationsProvider>
                </StrapiAppProvider>
              </QueryClientProvider>
            </Theme>
          </LanguageProvider>
        </AuthProvider>
      </HistoryProvider>
    </Provider>
  );
};

export { Providers };
