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
import { SET_APP_RUNTIME_STATUS } from '../App/constants';

const CM = React.lazy(() =>
  import(/* webpackChunkName: "content-manager" */ '../../content-manager/pages/App').then(
    (module) => ({ default: module.ContentManger })
  )
);
const GuidedTourModal = React.lazy(() =>
  import(/* webpackChunkName: "Admin_GuidedTourModal" */ '../../components/GuidedTour/Modal').then(
    (module) => ({ default: module.GuidedTourModal })
  )
);
const HomePage = React.lazy(() =>
  import(/* webpackChunkName: "Admin_homePage" */ '../HomePage').then((module) => ({
    default: module.HomePage,
  }))
);
const InstalledPluginsPage = React.lazy(() =>
  import(/* webpackChunkName: "Admin_pluginsPage" */ '../InstalledPluginsPage').then((module) => ({
    default: module.PluginsPage,
  }))
);
const MarketplacePage = React.lazy(() =>
  import(/* webpackChunkName: "Admin_marketplace" */ '../MarketplacePage')
);
const Onboarding = React.lazy(() =>
  import(/* webpackChunkName: "Admin_Onboarding" */ './Onboarding').then((module) => ({
    default: module.Onboarding,
  }))
);
const ProfilePage = React.lazy(() =>
  import(/* webpackChunkName: "Admin_profilePage" */ '../ProfilePage').then((module) => ({
    default: module.ProfilePage,
  }))
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

  return (
    <DndProvider backend={HTML5Backend}>
      <Flex alignItems="stretch">
        <LeftMenu
          generalSectionLinks={generalSectionLinks}
          pluginsSectionLinks={pluginsSectionLinks}
        />

        <Box flex="1">
          {isLoading ? (
            <LoadingIndicatorPage />
          ) : (
            <Switch>
              <Route path="/" component={HomePage} exact />
              <Route path="/me" component={ProfilePage} exact />
              <Route path="/content-manager" component={CM} />
              {menu.map(({ to, Component, exact }) => (
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
              ))}
              <Route path="/settings/:settingId" component={SettingsPage} />
              <Route path="/settings" component={SettingsPage} exact />
              <Route path="/marketplace" component={MarketplacePage} />
              <Route path="/list-plugins" component={InstalledPluginsPage} exact />
            </Switch>
          )}
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
