import adminPermissions from '../../../permissions';

const defaultGlobalLinks = [
  {
    title: { id: 'Settings.webhooks.title' },
    to: '/settings/webhooks',
    name: 'webhooks',
    isDisplayed: false,
    permissions: adminPermissions.settings.webhooks.main,
  },
];

export default defaultGlobalLinks;
