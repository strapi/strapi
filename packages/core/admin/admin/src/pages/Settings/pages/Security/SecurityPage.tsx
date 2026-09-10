import { Box, EmptyStateLayout, Flex } from '@strapi/design-system';
import { EmptyPermissions } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

import { Layouts } from '../../../../components/Layouts/Layout';
import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useAdminRoles } from '../../../../hooks/useAdminRoles';
import { useRBAC } from '../../../../hooks/useRBAC';
import { selectAdminPermissions } from '../../../../selectors';
import { useGetMfaStatusQuery } from '../../../../services/mfa';
import { useGetSecuritySettingsQuery } from '../../../../services/securitySettings';
import { isNotFoundError } from '../../../../utils/baseQuery';

import { PasskeysCard } from './components/PasskeysCard';
import { TrustedDevicesCard } from './components/TrustedDevicesCard';
import { TwoFactorEnforcementCard } from './components/TwoFactorEnforcementCard';

/**
 * Settings > Administration Panel > Security. A generic home for security settings; its cards are
 * two-factor enforcement (`TwoFactorEnforcementCard`), trusted devices (`TrustedDevicesCard`) and
 * passkeys (`PasskeysCard`); each is an accessible region named by its own heading, and each saves
 * its own object. The settings link is the one place that reads the future flag; this page keys
 * off the API instead: a 404 from `/admin/security-settings` means the feature is off (kill
 * switch or flag), and it renders a disabled-feature state rather than an empty form.
 *
 * Role names need `admin::roles.read` on top of `admin::security-settings.read`; without it the
 * card renders with an empty role list (the server still enforces role ids on save).
 */
const SecurityPage = () => {
  const { formatMessage } = useIntl();
  const permissions = useTypedSelector(selectAdminPermissions);

  const {
    isLoading: isLoadingRBAC,
    allowedActions: { canUpdate, canRead: canReadRoles },
  } = useRBAC({
    update: permissions.settings?.security?.update ?? [],
    readRoles: permissions.settings?.roles.read ?? [],
  });

  const {
    data: settings,
    error,
    isLoading: isLoadingSettings,
    isFetching: isFetchingSettings,
  } = useGetSecuritySettingsQuery();
  const {
    roles,
    isLoading: isLoadingRoles,
    isUninitialized: isUninitializedRoles,
  } = useAdminRoles(undefined, { skip: !canReadRoles });
  // The caller's own enrolment decides whether a downgrade needs a code; a 404 here is the same
  // feature-off signal and simply reads as "not enrolled".
  const { data: mfaStatus } = useGetMfaStatusQuery();

  const isFeatureOff = isNotFoundError(error);
  // While `canReadRoles` is true, the roles query starts out uninitialized (its `isLoading` is
  // false) for the render where RBAC first resolves, which would otherwise paint the card with an
  // empty role list for one frame before the roles request even starts.
  const isLoading =
    isLoadingRBAC ||
    isLoadingSettings ||
    (canReadRoles && (isLoadingRoles || isUninitializedRoles));

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          { name: 'Security' }
        )}
      </Page.Title>
      <Layouts.Header
        title={formatMessage({ id: 'Settings.security.title', defaultMessage: 'Security' })}
        subtitle={formatMessage({
          id: 'Settings.security.description',
          defaultMessage: 'Security requirements for everyone who uses this admin panel.',
        })}
      />
      <Layouts.Content>
        {isLoading ? (
          <Page.Loading />
        ) : isFeatureOff ? (
          <Box background="neutral0" hasRadius shadow="filterShadow">
            <EmptyStateLayout
              icon={<EmptyPermissions width="16rem" />}
              content={formatMessage({
                id: 'Settings.security.mfa.disabled',
                defaultMessage:
                  'Two-factor authentication is turned off on this instance (admin.auth.mfa.enabled in the admin configuration). Turn it on to manage its requirements here.',
              })}
            />
          </Box>
        ) : error || !settings ? (
          <Page.Error />
        ) : (
          <Flex direction="column" alignItems="stretch" gap={7}>
            <TwoFactorEnforcementCard
              settings={settings.mfa}
              roles={roles}
              canUpdate={canUpdate}
              callerEnrolled={Boolean(mfaStatus?.enabled)}
              isRefreshing={isFetchingSettings}
            />
            <TrustedDevicesCard
              settings={settings.trustedDevices}
              canUpdate={canUpdate}
              callerEnrolled={Boolean(mfaStatus?.enabled)}
              isRefreshing={isFetchingSettings}
            />
            <PasskeysCard
              settings={settings.passkeys}
              canUpdate={canUpdate}
              callerEnrolled={Boolean(mfaStatus?.enabled)}
              hasLocalPassword={mfaStatus ? mfaStatus.hasLocalPassword : true}
              isRefreshing={isFetchingSettings}
            />
          </Flex>
        )}
      </Layouts.Content>
    </Page.Main>
  );
};

const ProtectedSecurityPage = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.security?.main
  );

  return (
    <Page.Protect permissions={permissions}>
      <SecurityPage />
    </Page.Protect>
  );
};

export { SecurityPage, ProtectedSecurityPage };
