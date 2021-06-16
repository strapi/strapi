/**
 *
 * Admin
 *
 */

import React, { Suspense, useEffect, lazy } from 'react';
import { Switch, Route } from 'react-router-dom';
// Components from @strapi/helper-plugin
import { CheckPagePermissions, useTracking, LoadingIndicatorPage } from '@strapi/helper-plugin';
import adminPermissions from '../../permissions';
import Header from '../../components/Header/index';
import NavTopRightWrapper from '../../components/NavTopRightWrapper';
import LeftMenu from '../../components/LeftMenu';

// TODO
import useMenuSections from '../../components/LeftMenu/useMenuSections';
import Onboarding from '../../components/Onboarding';
import { useReleaseNotification } from '../../hooks';
import Logout from './Logout';
import Wrapper from './Wrapper';
import Content from './Content';

const HomePage = lazy(() => import(/* webpackChunkName: "Admin_homePage" */ '../HomePage'));
const InstalledPluginsPage = lazy(() =>
  import(/* webpackChunkName: "Admin_pluginsPage" */ '../InstalledPluginsPage')
);
const MarketplacePage = lazy(() =>
  import(/* webpackChunkName: "Admin_marketplace" */ '../MarketplacePage')
);
const NotFoundPage = lazy(() => import('../NotFoundPage'));
const PluginDispatcher = lazy(() =>
  import(/* webpackChunkName: "Admin_pluginDispatcher" */ '../PluginDispatcher')
);
const ProfilePage = lazy(() =>
  import(/* webpackChunkName: "Admin_profilePage" */ '../ProfilePage')
);
const SettingsPage = lazy(() =>
  import(/* webpackChunkName: "Admin_settingsPage" */ '../SettingsPage')
);
// These are internal plugins
const CM = lazy(() =>
  import(
    /* webpackChunkName: "content-manager" */ '@strapi/plugin-content-manager/admin/src/pages/App'
  )
);
const CTB = lazy(() =>
  import(
    /* webpackChunkName: "content-type-builder" */ '@strapi/plugin-content-type-builder/admin/src/pages/App'
  )
);
const Upload = lazy(() =>
  import(/* webpackChunkName: "upload" */ '@strapi/plugin-upload/admin/src/pages/App')
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
  // Show a notification when the current version of Strapi is not the latest one
  useReleaseNotification();
  useTrackUsage();
  const { isLoading, generalSectionLinks, pluginsSectionLinks } = useMenuSections();

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Wrapper>
      <LeftMenu
        generalSectionLinks={generalSectionLinks}
        pluginsSectionLinks={pluginsSectionLinks}
      />
      <NavTopRightWrapper>
        {/* Injection zone not ready yet */}
        <Logout />
      </NavTopRightWrapper>
      <div className="adminPageRightWrapper">
        <Header />
        <Content>
          <Suspense fallback={<LoadingIndicatorPage />}>
            <Switch>
              <Route path="/" component={HomePage} exact />
              <Route path="/me" component={ProfilePage} exact />
              <Route path="/plugins/content-manager" component={CM} />
              <Route path="/plugins/content-type-builder" component={CTB} />
              <Route path="/plugins/upload" component={Upload} />
              <Route path="/plugins/:pluginId" component={PluginDispatcher} />
              <Route path="/settings/:settingId" component={SettingsPage} />
              <Route path="/settings" component={SettingsPage} exact />
              <Route path="/marketplace">
                <CheckPagePermissions permissions={adminPermissions.marketplace.main}>
                  <MarketplacePage />
                </CheckPagePermissions>
              </Route>
              <Route path="/list-plugins" exact>
                <CheckPagePermissions permissions={adminPermissions.marketplace.main}>
                  <InstalledPluginsPage />
                </CheckPagePermissions>
              </Route>
              <Route path="/404" component={NotFoundPage} />
              <Route path="" component={NotFoundPage} />
            </Switch>
          </Suspense>
        </Content>
      </div>
      <Onboarding />
    </Wrapper>
  );
};

export default Admin;
export { useTrackUsage };
