/**
 *
 * SettingsPage
 *
 */

// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file you also need to update the documentation accordingly
// Here's the file: strapi/docs/3.0.0-beta.x/plugin-development/frontend-settings-api.md
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import React, { memo, useMemo, useState } from 'react';
import { LoadingIndicatorPage, useStrapiApp } from '@strapi/helper-plugin';
import { Switch, Redirect, Route, useParams } from 'react-router-dom';
import { Layout } from '@strapi/parts/Layout';
import { useIntl } from 'react-intl';
import HeaderSearch from '../../components/HeaderSearch';
import PageTitle from '../../components/PageTitle';
import SettingsSearchHeaderProvider from '../../components/SettingsHeaderSearchContextProvider';
import { useSettingsMenu } from '../../hooks';
import { createRoute, makeUniqueRoutes } from '../../utils';
import ApplicationInfosPage from '../ApplicationInfosPage';
import { createSectionsRoutes, routes } from './utils';
import SettingsNav from './components/SettingsNav';

function SettingsPage() {
  const { settingId } = useParams();
  const { settings } = useStrapiApp();
  const { formatMessage } = useIntl();
  // TODO
  const [headerSearchState, setShowHeaderSearchState] = useState({ show: false, label: '' });

  const { isLoading, menu } = useSettingsMenu();

  // Creates the admin routes
  const adminRoutes = useMemo(() => {
    return makeUniqueRoutes(
      routes.map(({ to, Component, exact }) => createRoute(Component, to, exact))
    );
  }, []);

  const pluginsRoutes = createSectionsRoutes(settings);

  const toggleHeaderSearch = label =>
    setShowHeaderSearchState(prev => {
      if (prev.show) {
        return {
          show: false,
          label: '',
        };
      }

      return { label, show: true };
    });

  // Since the useSettingsMenu hook can make API calls in order to check the links permissions
  // We need to add a loading state to prevent redirecting the user while permissions are being checked
  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!settingId) {
    return <Redirect to="/settings/application-infos" />;
  }

  const settingTitle = formatMessage({ id: 'app.components.LeftMenuLinkContainer.settings' });

  return (
    <SettingsSearchHeaderProvider value={{ toggleHeaderSearch }}>
      <Layout sideNav={<SettingsNav menu={menu} />}>
        <PageTitle title={settingTitle} />

        <Switch>
          <Route path="/settings/application-infos" component={ApplicationInfosPage} exact />
          {adminRoutes}
          {pluginsRoutes}
        </Switch>

        {headerSearchState.show && <HeaderSearch label={headerSearchState.label} />}
      </Layout>
    </SettingsSearchHeaderProvider>
  );
}

export default memo(SettingsPage);
export { SettingsPage };
