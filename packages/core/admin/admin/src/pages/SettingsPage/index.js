/**
 *
 * SettingsPage
 *
 */

// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file you also need to update the documentation accordingly
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-settings-api.md
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import React, { memo, useMemo } from 'react';

import { Layout } from '@strapi/design-system';
import { LoadingIndicatorPage, useStrapiApp } from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { Redirect, Route, Switch, useParams } from 'react-router-dom';

import { useSettingsMenu } from '../../hooks';
import { useEnterprise } from '../../hooks/useEnterprise';
import { createRoute, makeUniqueRoutes } from '../../utils';

import SettingsNav from './components/SettingsNav';
import { ROUTES_CE } from './constants';
import ApplicationInfosPage from './pages/ApplicationInfosPage';
import { createSectionsRoutes } from './utils';

function SettingsPage() {
  const { settingId } = useParams();
  const { settings } = useStrapiApp();
  const { formatMessage } = useIntl();
  const { isLoading, menu } = useSettingsMenu();
  const routes = useEnterprise(
    ROUTES_CE,
    async () => (await import('../../../../ee/admin/pages/SettingsPage/constants')).ROUTES_EE,
    {
      combine(ceRoutes, eeRoutes) {
        return [...ceRoutes, ...eeRoutes];
      },
      defaultValue: [],
    }
  );

  // Creates the admin routes
  const adminRoutes = useMemo(() => {
    return makeUniqueRoutes(
      routes.map(({ to, Component, exact }) => createRoute(Component, to, exact))
    );
  }, [routes]);

  const pluginsRoutes = createSectionsRoutes(settings);

  // Since the useSettingsMenu hook can make API calls in order to check the links permissions
  // We need to add a loading state to prevent redirecting the user while permissions are being checked
  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!settingId) {
    return <Redirect to="/settings/application-infos" />;
  }

  const settingTitle = formatMessage({
    id: 'global.settings',
    defaultMessage: 'Settings',
  });

  return (
    <Layout sideNav={<SettingsNav menu={menu} />}>
      <Helmet title={settingTitle} />

      <Switch>
        <Route path="/settings/application-infos" component={ApplicationInfosPage} exact />
        {adminRoutes}
        {pluginsRoutes}
      </Switch>
    </Layout>
  );
}

export default memo(SettingsPage);
export { SettingsPage };
