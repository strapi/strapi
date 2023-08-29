import React from 'react';

import {
  AutoReloadOverlayBlockerProvider,
  CustomFieldsProvider,
  LibraryProvider,
  NotificationsProvider,
  OverlayBlockerProvider,
  StrapiAppProvider,
} from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';

import { AdminContext } from '../../contexts';
import ConfigurationsProvider from '../ConfigurationsProvider';
import GuidedTour from '../GuidedTour';
import LanguageProvider from '../LanguageProvider';
import Theme from '../Theme';
import ThemeToggleProvider from '../ThemeToggleProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

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
}) => {
  return (
    <LanguageProvider messages={messages} localeNames={localeNames}>
      <ThemeToggleProvider themes={themes}>
        <Theme>
          <QueryClientProvider client={queryClient}>
            <Provider store={store}>
              <AdminContext.Provider value={{ getAdminInjectedComponents }}>
                <ConfigurationsProvider
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
                            <GuidedTour>
                              <NotificationsProvider>{children}</NotificationsProvider>
                            </GuidedTour>
                          </OverlayBlockerProvider>
                        </AutoReloadOverlayBlockerProvider>
                      </CustomFieldsProvider>
                    </LibraryProvider>
                  </StrapiAppProvider>
                </ConfigurationsProvider>
              </AdminContext.Provider>
            </Provider>
          </QueryClientProvider>
        </Theme>
      </ThemeToggleProvider>
    </LanguageProvider>
  );
};

Providers.propTypes = {
  authLogo: PropTypes.oneOfType([PropTypes.string, PropTypes.any]).isRequired,
  children: PropTypes.element.isRequired,
  components: PropTypes.object.isRequired,
  customFields: PropTypes.object.isRequired,
  fields: PropTypes.object.isRequired,
  getAdminInjectedComponents: PropTypes.func.isRequired,
  getPlugin: PropTypes.func.isRequired,
  localeNames: PropTypes.objectOf(PropTypes.string).isRequired,
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
  menuLogo: PropTypes.oneOfType([PropTypes.string, PropTypes.any]).isRequired,
  messages: PropTypes.object.isRequired,
  plugins: PropTypes.object.isRequired,
  runHookParallel: PropTypes.func.isRequired,
  runHookWaterfall: PropTypes.func.isRequired,
  runHookSeries: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
  showReleaseNotification: PropTypes.bool.isRequired,
  showTutorials: PropTypes.bool.isRequired,
  store: PropTypes.object.isRequired,
  themes: PropTypes.shape({
    light: PropTypes.shape({
      colors: PropTypes.object.isRequired,
      shadows: PropTypes.object.isRequired,
      sizes: PropTypes.object.isRequired,
      zIndices: PropTypes.array.isRequired,
      spaces: PropTypes.array.isRequired,
      borderRadius: PropTypes.string.isRequired,
      mediaQueries: PropTypes.object.isRequired,
      fontSizes: PropTypes.array.isRequired,
      lineHeights: PropTypes.array.isRequired,
      fontWeights: PropTypes.object.isRequired,
    }).isRequired,
    dark: PropTypes.shape({
      colors: PropTypes.object.isRequired,
      shadows: PropTypes.object.isRequired,
      sizes: PropTypes.object.isRequired,
      zIndices: PropTypes.array.isRequired,
      spaces: PropTypes.array.isRequired,
      borderRadius: PropTypes.string.isRequired,
      mediaQueries: PropTypes.object.isRequired,
      fontSizes: PropTypes.array.isRequired,
      lineHeights: PropTypes.array.isRequired,
      fontWeights: PropTypes.object.isRequired,
    }).isRequired,
    custom: PropTypes.object,
  }).isRequired,
};

export default Providers;
