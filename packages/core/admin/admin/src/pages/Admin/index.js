/**
 *
 * Admin
 *
 */

import * as React from 'react';

import { Box, Flex } from '@strapi/design-system';
import { LoadingIndicatorPage, useStrapiApp, useTracking } from '@strapi/helper-plugin';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDispatch, useSelector } from 'react-redux';
import { Route, Switch } from 'react-router-dom';

import LeftMenu from '../../components/LeftMenu';
import useConfigurations from '../../hooks/useConfigurations';
import useMenu from '../../hooks/useMenu';
import createRoute from '../../utils/createRoute';
import { SET_APP_RUNTIME_STATUS } from '../App/constants';

const CM = React.lazy(() =>
  import(/* webpackChunkName: "content-manager" */ '../../content-manager/pages/App')
);
const GuidedTourModal = React.lazy(() =>
  import(/* webpackChunkName: "Admin_GuidedTourModal" */ '../../components/GuidedTour/Modal').then(
    (module) => ({ default: module.GuidedTourModal })
  )
);
const HomePage = React.lazy(() => import(/* webpackChunkName: "Admin_homePage" */ '../HomePage'));
const InstalledPluginsPage = React.lazy(() =>
  import(/* webpackChunkName: "Admin_pluginsPage" */ '../InstalledPluginsPage')
);
const MarketplacePage = React.lazy(() =>
  import(/* webpackChunkName: "Admin_marketplace" */ '../MarketplacePage')
);
const NotFoundPage = React.lazy(() =>
  import(/* webpackChunkName: "Admin_NotFoundPage" */ '../NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  }))
);
const InternalErrorPage = React.lazy(() =>
  import(/* webpackChunkName: "Admin_InternalErrorPage" */ '../InternalErrorPage').then(
    (module) => ({ default: module.InternalErrorPage })
  )
);
const Onboarding = React.lazy(() =>
  import(/* webpackChunkName: "Admin_Onboarding" */ './Onboarding').then((module) => ({
    default: module.Onboarding,
  }))
);
const ProfilePage = React.lazy(() =>
  import(/* webpackChunkName: "Admin_profilePage" */ '../ProfilePage')
);
const SettingsPage = React.lazy(() =>
  import(/* webpackChunkName: "Admin_settingsPage" */ '../SettingsPage').then((module) => ({
    default: module.SettingsPage,
  }))
);

export const Admin = () => {
  const { isLoading, generalSectionLinks, pluginsSectionLinks } = useMenu();
  const { menu } = useStrapiApp();
  const { showTutorials } = useConfigurations();
  const { trackUsage } = useTracking();
  const dispatch = useDispatch();
  const appStatus = useSelector((state) => state.admin_app.status);

  React.useEffect(() => {
    // Make sure the event is only send once after accessing the admin panel
    // and not at runtime for example when regenerating the permissions with the ctb
    // or with i18n
    if (appStatus === 'init') {
      trackUsage('didAccessAuthenticatedAdministration');
      dispatch({ type: SET_APP_RUNTIME_STATUS });
    }
  }, [appStatus, dispatch, trackUsage]);

  const routes = menu
    .filter((link) => link.Component)
    .map(({ to, Component, exact }) => createRoute(Component, to, exact));

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Flex alignItems="stretch">
        <LeftMenu
          generalSectionLinks={generalSectionLinks}
          pluginsSectionLinks={pluginsSectionLinks}
        />

        <Box flex="1">
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
        </Box>

        {/* TODO: we should move the logic to determine whether the guided tour is displayed
            or not out of the component, to make the code-splitting more effective
        */}
        <GuidedTourModal />

        {showTutorials && <Onboarding />}
      </Flex>
    </DndProvider>
  );
};
