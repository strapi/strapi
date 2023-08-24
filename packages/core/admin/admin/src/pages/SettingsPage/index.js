import * as React from 'react';

import { Layout } from '@strapi/design-system';
import { LoadingIndicatorPage, useStrapiApp } from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { Redirect, Route, Switch, useParams } from 'react-router-dom';

import { useSettingsMenu } from '../../hooks';
import { useEnterprise } from '../../hooks/useEnterprise';

import SettingsNav from './components/SettingsNav';
import { SETTINGS_ROUTES_CE } from './constants';
import ApplicationInfosPage from './pages/ApplicationInfosPage';

export function SettingsPage() {
  const { settingId } = useParams();
  const { settings } = useStrapiApp();
  const { formatMessage } = useIntl();
  const { isLoading, menu } = useSettingsMenu();
  const routes = useEnterprise(
    SETTINGS_ROUTES_CE,
    async () =>
      (await import('../../../../ee/admin/pages/SettingsPage/constants')).SETTINGS_ROUTES_EE,
    {
      combine(ceRoutes, eeRoutes) {
        return [...ceRoutes, ...eeRoutes];
      },
      defaultValue: [],
    }
  );

  if (!settingId) {
    return <Redirect to="/settings/application-infos" />;
  }

  return (
    <Layout sideNav={<SettingsNav menu={menu} />}>
      <Helmet
        title={formatMessage({
          id: 'global.settings',
          defaultMessage: 'Settings',
        })}
      />

      {isLoading ? (
        <LoadingIndicatorPage />
      ) : (
        <Switch>
          <Route
            path="/settings/application-infos"
            render={() => (
              <React.Suspense fallback={<LoadingIndicatorPage />}>
                <ApplicationInfosPage />
              </React.Suspense>
            )}
            exact
          />

          {routes.map(({ path, Component }) => (
            <Route
              key={path}
              path={path}
              render={() => (
                <React.Suspense fallback={<LoadingIndicatorPage />}>
                  <Component />
                </React.Suspense>
              )}
              exact
            />
          ))}

          {Object.values(settings).flatMap((section) =>
            section.links.map(({ Component, to, exact }) => (
              <Route
                render={() => (
                  <React.Suspense fallback={<LoadingIndicatorPage />}>
                    <Component />
                  </React.Suspense>
                )}
                key={to}
                path={to}
                exact={exact || false}
              />
            ))
          )}
        </Switch>
      )}
    </Layout>
  );
}
