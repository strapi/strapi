/**
 *
 * Admin
 *
 */

import * as React from 'react';

import { LoadingIndicatorPage, useStrapiApp, useTracking } from '@strapi/helper-plugin';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Route, Switch } from 'react-router-dom';

import { GuidedTourModal } from '../components/GuidedTour/Modal';
import { LeftMenu } from '../components/LeftMenu';
import { Onboarding } from '../components/Onboarding';
import { ACTION_SET_APP_RUNTIME_STATUS } from '../constants';
import { useConfiguration } from '../contexts/configuration';
import { useTypedDispatch, useTypedSelector } from '../core/store/hooks';
import { useMenu } from '../hooks/useMenu';
import { AppLayout } from '../layouts/AppLayout';
import { createRoute } from '../utils/createRoute';

const CM = React.lazy(
  // @ts-expect-error – No types, yet.
  () => import('../content-manager/pages/App')
);
const HomePage = React.lazy(() =>
  import('./HomePage').then((mod) => ({
    default: mod.HomePage,
  }))
);
const InstalledPluginsPage = React.lazy(() =>
  import('./InstalledPluginsPage').then((mod) => ({
    default: mod.ProtectedInstalledPluginsPage,
  }))
);
const MarketplacePage = React.lazy(() =>
  import('./Marketplace/MarketplacePage').then((mod) => ({ default: mod.ProtectedMarketplacePage }))
);
const NotFoundPage = React.lazy(() =>
  import('./NotFoundPage').then(({ NotFoundPage }) => ({ default: NotFoundPage }))
);
const InternalErrorPage = React.lazy(() =>
  import('./InternalErrorPage').then(({ InternalErrorPage }) => ({
    default: InternalErrorPage,
  }))
);

const ProfilePage = React.lazy(() =>
  import('./ProfilePage').then((mod) => ({
    default: mod.ProfilePage,
  }))
);
const SettingsPage = React.lazy(() =>
  // @ts-expect-error – No types, yet.
  import('./SettingsPage').then((module) => ({
    default: module.SettingsPage,
  }))
);

const Admin = () => {
  const { trackUsage } = useTracking();
  const dispatch = useTypedDispatch();
  const appStatus = useTypedSelector((state) => state.admin_app.status);

  const { isLoading, generalSectionLinks, pluginsSectionLinks } = useMenu();
  const { menu } = useStrapiApp();
  const { showTutorials } = useConfiguration();

  React.useEffect(() => {
    // Make sure the event is only send once after accessing the admin panel
    // and not at runtime for example when regenerating the permissions with the ctb
    // or with i18n
    if (appStatus === 'init') {
      trackUsage('didAccessAuthenticatedAdministration');

      dispatch({ type: ACTION_SET_APP_RUNTIME_STATUS });
    }
  }, [appStatus, dispatch, trackUsage]);

  const routes = React.useMemo(() => {
    return (
      menu
        .filter((link) => link.Component)
        // we've filtered out the links that don't have a component above
        .map(({ to, Component, exact }) => createRoute(Component!, to, exact))
    );
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
        <React.Suspense fallback={<LoadingIndicatorPage />}>
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
        </React.Suspense>
        <GuidedTourModal />

        {showTutorials && <Onboarding />}
      </AppLayout>
    </DndProvider>
  );
};

export { Admin };
