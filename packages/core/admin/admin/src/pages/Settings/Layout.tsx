import { Box } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { Navigate, Outlet, useMatch } from 'react-router-dom';

import { Layouts } from '../../components/Layouts/Layout';
import { Page } from '../../components/PageHelpers';
import { SubNav } from '../../components/SubNav';
import { RESPONSIVE_DEFAULT_SPACING } from '../../constants/theme';
import { BackButton } from '../../features/BackButton';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useSettingsMenu } from '../../hooks/useSettingsMenu';

import { SettingsNav } from './components/SettingsNav';

const Layout = () => {
  /**
   * This ensures we're capturing the settingId from the URL
   * but also lets any nesting after that pass.
   */
  const match = useMatch('/settings/:settingId/*');
  const { formatMessage } = useIntl();
  const { isLoading } = useSettingsMenu();
  const isMobile = useIsMobile();

  // Since the useSettingsMenu hook can make API calls in order to check the links permissions
  // We need to add a loading state to prevent redirecting the user while permissions are being checked
  if (isLoading) {
    return <Page.Loading />;
  }

  // On /settings base route
  if (!match?.params.settingId) {
    // On desktop: redirect to first settings page
    if (!isMobile) {
      return <Navigate to="application-infos" />;
    }

    // On mobile: show navigation page
    return (
      <>
        <Page.Title>
          {formatMessage({
            id: 'global.settings',
            defaultMessage: 'Settings',
          })}
        </Page.Title>
        <SubNav.PageWrapper>
          <SettingsNav isFullPage />
        </SubNav.PageWrapper>
      </>
    );
  }

  return (
    <Layouts.Root sideNav={<SettingsNav />}>
      <Page.Title>
        {formatMessage({
          id: 'global.settings',
          defaultMessage: 'Settings',
        })}
      </Page.Title>
      <Box
        display={{ initial: 'block', medium: 'none' }}
        paddingLeft={RESPONSIVE_DEFAULT_SPACING}
        paddingRight={RESPONSIVE_DEFAULT_SPACING}
        paddingTop={RESPONSIVE_DEFAULT_SPACING}
      >
        <BackButton fallback="/settings" />
      </Box>
      <Outlet />
    </Layouts.Root>
  );
};

export { Layout };
