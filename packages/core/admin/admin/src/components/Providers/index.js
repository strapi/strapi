import React from 'react';
import PropTypes from 'prop-types';
import { QueryClientProvider, QueryClient } from 'react-query';
import { LibraryProvider, CustomFieldsProvider, StrapiAppProvider } from '@strapi/helper-plugin';
import { Provider } from 'react-redux';
import { AdminContext } from '../../contexts';
import ConfigurationsProvider from '../ConfigurationsProvider';
import LanguageProvider from '../LanguageProvider';
import GuidedTour from '../GuidedTour';
import AutoReloadOverlayBlockerProvider from '../AutoReloadOverlayBlockerProvider';
import Notifications from '../Notifications';
import OverlayBlocker from '../OverlayBlocker';
import ThemeToggleProvider from '../ThemeToggleProvider';
import Theme from '../Theme';

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
  fetchClient,
}) => {
  return (
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
                  fetchClient={fetchClient}
                >
                  <LibraryProvider components={components} fields={fields}>
                    <CustomFieldsProvider customFields={customFields}>
                      <LanguageProvider messages={messages} localeNames={localeNames}>
                        <AutoReloadOverlayBlockerProvider>
                          <OverlayBlocker>
                            <GuidedTour>
                              <Notifications>{children}</Notifications>
                            </GuidedTour>
                          </OverlayBlocker>
                        </AutoReloadOverlayBlockerProvider>
                      </LanguageProvider>
                    </CustomFieldsProvider>
                  </LibraryProvider>
                </StrapiAppProvider>
              </ConfigurationsProvider>
            </AdminContext.Provider>
          </Provider>
        </QueryClientProvider>
      </Theme>
    </ThemeToggleProvider>
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
  fetchClient: PropTypes.object.isRequired,
};

export default Providers;
