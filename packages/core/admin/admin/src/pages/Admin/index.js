/**
 *
 * Admin
 *
 */

import React, { Suspense, useEffect, useMemo, lazy } from 'react';
import { Switch, Route } from 'react-router-dom';
// Components from @strapi/helper-plugin
import { useTracking, LoadingIndicatorPage, useStrapiApp } from '@strapi/helper-plugin';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import LeftMenu from '../../components/LeftMenu';
import AppLayout from '../../layouts/AppLayout';
import { useMenu } from '../../hooks';
import Onboarding from './Onboarding';
import { createRoute } from '../../utils';
import GuidedTourModal from '../../components/GuidedTour/Modal';

const CM = lazy(() =>
  import(/* webpackChunkName: "content-manager" */ '../../content-manager/pages/App')
);
const HomePage = lazy(() => import(/* webpackChunkName: "Admin_homePage" */ '../HomePage'));
const InstalledPluginsPage = lazy(() =>
  import(/* webpackChunkName: "Admin_pluginsPage" */ '../InstalledPluginsPage')
);
const MarketplacePage = lazy(() =>
  import(/* webpackChunkName: "Admin_marketplace" */ '../MarketplacePage')
);
const NotFoundPage = lazy(() =>
  import(/* webpackChunkName: "Admin_NotFoundPage" */ '../NotFoundPage')
);
const InternalErrorPage = lazy(() =>
  import(/* webpackChunkName: "Admin_InternalErrorPage" */ '../InternalErrorPage')
);

const ProfilePage = lazy(() =>
  import(/* webpackChunkName: "Admin_profilePage" */ '../ProfilePage')
);
const SettingsPage = lazy(() =>
  import(/* webpackChunkName: "Admin_settingsPage" */ '../SettingsPage')
);

// Simple hook easier for testing
const useTrackUsage = () => {
  const { trackUsage } = useTracking();

  useEffect(() => {
    trackUsage('didAccessAuthenticatedAdministration');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

const Admin = () => {
  useTrackUsage();
  const { isLoading, generalSectionLinks, pluginsSectionLinks } = useMenu();
  const { menu } = useStrapiApp();

  const routes = useMemo(() => {
    return menu
      .filter(link => link.Component)
      .map(({ to, Component, exact }) => createRoute(Component, to, exact));
  }, [menu]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <AppLayout
        sideNav={
          <LeftMenu
            generalSectionLinks={generalSectionLinks}
            pluginsSectionLinks={pluginsSectionLinks}
          />
        }
      >
        <Suspense fallback={<LoadingIndicatorPage />}>
          <Switch>
            <Route path="/" component={HomePage} exact />
            <Route path="/me" component={ProfilePage} exact />
            <Route path="/content-manager" component={CM} />
            {routes}
            <Route path="/settings/:settingId" component={SettingsPage} />
            <Route path="/settings" component={SettingsPage} exact />
            <Route path="/marketplace">
              <MarketplacePage />
            </Route>
            <Route path="/list-plugins" exact>
              <InstalledPluginsPage />
            </Route>
            <Route path="/404" component={NotFoundPage} />
            <Route path="/500" component={InternalErrorPage} />
            <Route path="" component={NotFoundPage} />
          </Switch>
        </Suspense>
        <GuidedTourModal />
        <Onboarding />
      </AppLayout>
    </DndProvider>
  );
};

export default Admin;
export { useTrackUsage };
