import { SETTINGS_BASE_URL } from '../../../../../admin/src/config';

const customGlobalLinks = [
  {
    title: { id: 'Settings.sso.title' },
    to: `${SETTINGS_BASE_URL}/single-sign-on`,
    name: 'sso',
    isDisplayed: false,
    permissions: [{ action: 'admin::provider-login.read', subject: null }],
  },
];

export default customGlobalLinks;
