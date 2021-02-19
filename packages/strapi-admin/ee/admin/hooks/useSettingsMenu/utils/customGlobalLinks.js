import { SETTINGS_BASE_URL } from '../../../../../admin/src/config';
import adminPermissions from '../../../../../admin/src/permissions';

const ssoGlobalRoutes = ENABLED_EE_FEATURES.includes('sso')
  ? [
      {
        title: { id: 'Settings.sso.title' },
        to: `${SETTINGS_BASE_URL}/single-sign-on`,
        name: 'sso',
        isDisplayed: false,
        permissions: adminPermissions.settings.sso.main,
      },
    ]
  : [];

const customGlobalLinks = [...ssoGlobalRoutes];

export default customGlobalLinks;
