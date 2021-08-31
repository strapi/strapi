import adminPermissions from '../../../permissions';

const defaultGlobalLinks = [
  {
    intlLabel: { id: 'Settings.webhooks.title', defaultMessage: 'Webhooks' },
    to: '/settings/webhooks',
    id: 'webhooks',
    isDisplayed: false,
    permissions: adminPermissions.settings.webhooks.main,
  },
];

export default defaultGlobalLinks;
