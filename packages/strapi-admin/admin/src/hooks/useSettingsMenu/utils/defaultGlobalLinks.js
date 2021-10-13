import { SETTINGS_BASE_URL } from '../../../config';
import adminPermissions from '../../../permissions';

const defaultGlobalLinks = [
  {
    title: { id: 'Settings.webhooks.title' },
    to: `${SETTINGS_BASE_URL}/webhooks`,
    name: 'webhooks',
    isDisplayed: false,
    permissions: adminPermissions.settings.webhooks.main,
  },
];

export default defaultGlobalLinks;
