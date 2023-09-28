import * as React from 'react';

import { Layout } from '@strapi/design-system';
import { LoadingIndicatorPage, useStrapiApp } from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';

import { useSettingsMenu } from '../../hooks';
import { useEnterprise } from '../../hooks/useEnterprise';
import createRoute from '../../utils/createRoute';
import makeUniqueRoutes from '../../utils/makeUniqueRoutes';

import SettingsNav from './components/SettingsNav';
import { ROUTES_CE } from './constants';
import ApplicationInfosPage from './pages/ApplicationInfosPage';

export function SettingsPage() {
  const { '*': settingId } = useParams();
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
  const adminRoutes = React.useMemo(() => {
    return makeUniqueRoutes(routes.map(({ to, Component }) => createRoute(Component, to)));
  }, [routes]);

  const pluginsRoutes = Object.values(settings).flatMap((section) => {
    const { links } = section;

    return links.map((link) => createRoute(link.Component, link.to));
  });

  // Since the useSettingsMenu hook can make API calls in order to check the links permissions
  // We need to add a loading state to prevent redirecting the user while permissions are being checked
  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!settingId) {
    return <Navigate replace to="/settings/application-infos" />;
  }

  return (
    <Layout sideNav={<SettingsNav menu={menu} />}>
      <Helmet
        title={formatMessage({
          id: 'global.settings',
          defaultMessage: 'Settings',
        })}
      />

      <Routes>
        <Route path="application-infos" Component={ApplicationInfosPage} />
        {adminRoutes}
        {pluginsRoutes}
      </Routes>
    </Layout>
  );
}
