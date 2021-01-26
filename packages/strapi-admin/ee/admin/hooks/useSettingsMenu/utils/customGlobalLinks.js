import { SETTINGS_BASE_URL } from '../../../../../admin/src/config';
import adminPermissions from '../../../../../admin/src/permissions';

const customGlobalLinks = [
  {
    title: { id: 'Settings.sso.title' },
    to: `${SETTINGS_BASE_URL}/single-sign-on`,
    name: 'sso',
    isDisplayed: false,
    permissions: adminPermissions.settings.sso.main,
  },
];

export default customGlobalLinks;
