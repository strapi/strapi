import { Layout as DSLayout } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { Navigate, Outlet, useMatch } from 'react-router-dom';

import { Page } from '../../components/PageHelpers';
import { useSettingsMenu } from '../../hooks/useSettingsMenu';

import { SettingsNav } from './components/SettingsNav';

const Layout = () => {
  /**
   * This ensures we're capturing the settingId from the URL
   * but also lets any nesting after that pass.
   */
  const match = useMatch('/settings/:settingId/*');
  const { formatMessage } = useIntl();
  const { isLoading, menu } = useSettingsMenu();

  // Since the useSettingsMenu hook can make API calls in order to check the links permissions
  // We need to add a loading state to prevent redirecting the user while permissions are being checked
  if (isLoading) {
    return <Page.Loading />;
  }

  if (!match?.params.settingId) {
    return <Navigate to="application-infos" />;
  }

  return (
    <DSLayout sideNav={<SettingsNav menu={menu} />}>
      <Page.Title>
        {formatMessage({
          id: 'global.settings',
          defaultMessage: 'Settings',
        })}
      </Page.Title>
      <Outlet />
    </DSLayout>
  );
};

export { Layout };
