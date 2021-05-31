/**
 *
 * Admin
 *
 */

import React, { Suspense, useEffect, useState, lazy } from 'react';
import { Switch, Route } from 'react-router-dom';
// Components from @strapi/helper-plugin
import {
  CheckPagePermissions,
  AppMenuContext,
  useTracking,
  LoadingIndicatorPage,
} from '@strapi/helper-plugin';
import adminPermissions from '../../permissions';
import Header from '../../components/Header/index';
import NavTopRightWrapper from '../../components/NavTopRightWrapper';
import LeftMenu from '../../components/LeftMenu';
import Onboarding from '../../components/Onboarding';
import { useReleaseNotification } from '../../hooks';
import Logout from './Logout';
import Wrapper from './Wrapper';
import Content from './Content';

const HomePage = lazy(() => import('../HomePage'));
const InstalledPluginsPage = lazy(() => import('../InstalledPluginsPage'));
const MarketplacePage = lazy(() => import('../MarketplacePage'));
const NotFoundPage = lazy(() => import('../NotFoundPage'));
const PluginDispatcher = lazy(() => import('../PluginDispatcher'));
const ProfilePage = lazy(() => import('../ProfilePage'));
const SettingsPage = lazy(() => import('../SettingsPage'));

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
  // FIXME:
  // This is temporary until we refactor the menu
  const [{ updateMenu }, setUpdateMenuFn] = useState({ updateMenu: null });

  const setUpdateMenu = updateMenuFn => {
    setUpdateMenuFn({ updateMenu: updateMenuFn });
  };

  return (
    <AppMenuContext.Provider value={updateMenu}>
      <Wrapper>
        <LeftMenu setUpdateMenu={setUpdateMenu} />
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
    </AppMenuContext.Provider>
  );
};

export default Admin;
export { useTrackUsage };
