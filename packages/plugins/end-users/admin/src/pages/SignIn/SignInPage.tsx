import { Page, useRBAC } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';

import { PERMISSIONS } from '../../constants';
import { useGetRolesQuery } from '../../services/roles';
import { useGetProfileFieldsQuery, useGetSettingsQuery } from '../../services/settings';
import { getTranslation } from '../../utils/getTranslation';

import { SignInForm } from './SignInForm';

/** `/settings/end-users/sign-in`: the sign-in settings an administrator changes while the app runs */
const SignInContent = () => {
  const { formatMessage } = useIntl();
  const {
    isLoading: isLoadingPermissions,
    allowedActions: { canUpdate },
  } = useRBAC(PERMISSIONS.settings);
  const settings = useGetSettingsQuery();
  const roles = useGetRolesQuery();
  const profileFields = useGetProfileFieldsQuery();

  if (isLoadingPermissions || settings.isLoading || roles.isLoading || profileFields.isLoading) {
    return <Page.Loading />;
  }

  // A failed roles read (an admin without roles.read) is not a failed page: the form lists no roles
  if (!settings.data || settings.error) {
    return <Page.Error />;
  }

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings — {name}' },
          {
            name: formatMessage({
              id: getTranslation('settings.sign-in.title'),
              defaultMessage: 'Sign-in',
            }),
          }
        )}
      </Page.Title>
      <SignInForm
        settings={settings.data}
        roles={(roles.data ?? []).filter((role) => role.type !== 'public')}
        rolesUnavailable={!roles.data}
        profileFields={profileFields.data ?? []}
        canUpdate={canUpdate}
      />
    </Page.Main>
  );
};

const SignInPage = () => (
  <Page.Protect permissions={PERMISSIONS.settings.read}>
    <SignInContent />
  </Page.Protect>
);

export { SignInPage };
