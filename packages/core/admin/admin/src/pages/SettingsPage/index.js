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
import {
  BackHeader,
  LeftMenuList,
  LoadingIndicatorPage,
  useStrapiApp,
} from '@strapi/helper-plugin';
import { Switch, Redirect, Route, useParams, useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import HeaderSearch from '../../components/HeaderSearch';
import PageTitle from '../../components/PageTitle';
import SettingsSearchHeaderProvider from '../../components/SettingsHeaderSearchContextProvider';
import { useSettingsMenu } from '../../hooks';

import ApplicationInfosPage from '../ApplicationInfosPage';
import { ApplicationDetailLink, MenuWrapper, StyledLeftMenu, Wrapper } from './components';

import {
  createRoute,
  createSectionsRoutes,
  makeUniqueRoutes,
  getSectionsToDisplay,
  routes,
} from './utils';

function SettingsPage() {
  const { settingId } = useParams();
  const { goBack } = useHistory();
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

  const pluginsRoutes = useMemo(() => createSectionsRoutes(settings), [settings]);

  // Only display accessible sections
  const filteredMenu = useMemo(() => getSectionsToDisplay(menu), [menu]);

  // Adapter until we refactor the helper-plugin/leftMenu
  const menuAdapter = filteredMenu.map(section => {
    return {
      ...section,
      title: section.intlLabel,
      links: section.links.map(link => {
        return {
          ...link,
          title: link.intlLabel,
          name: link.id,
        };
      }),
    };
  });

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
      <PageTitle title={settingTitle} />
      <Wrapper>
        <BackHeader onClick={goBack} />

        <div className="row">
          <div className="col-md-3">
            <MenuWrapper>
              <ApplicationDetailLink />
              <StyledLeftMenu>
                {menuAdapter.map(item => {
                  return <LeftMenuList {...item} key={item.id} />;
                })}
              </StyledLeftMenu>
            </MenuWrapper>
          </div>

          <div className="col-md-9">
            <Switch>
              <Route path="/settings/application-infos" component={ApplicationInfosPage} exact />
              {adminRoutes}
              {pluginsRoutes}
            </Switch>
          </div>
        </div>
        {headerSearchState.show && <HeaderSearch label={headerSearchState.label} />}
      </Wrapper>
    </SettingsSearchHeaderProvider>
  );
}

export default memo(SettingsPage);
export { SettingsPage };
