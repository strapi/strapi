import adminPermissions from '../../../permissions';

const defaultGlobalLinks = [
  {
    intlLabel: { id: 'Settings.application.title', defaultMessage: 'Application' },
    to: '/settings/application-infos',
    id: 'application-infos',
    isDisplayed: false,
    permissions: [],
  },
  {
    intlLabel: { id: 'Settings.webhooks.title', defaultMessage: 'Webhooks' },
    to: '/settings/webhooks',
    id: 'webhooks',
    isDisplayed: false,
    permissions: adminPermissions.settings.webhooks.main,
  },
];

export default defaultGlobalLinks;
