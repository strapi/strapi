import adminPermissions from '../../../permissions';

const defaultGlobalLinks = [
  {
    intlLabel: { id: 'Settings.application.title', defaultMessage: 'Overview' },
    to: '/settings/application-infos',
    id: '000-application-infos',
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
  {
    intlLabel: { id: 'Settings.apiTokens.title', defaultMessage: 'API Tokens' },
    to: '/settings/api-tokens?sort=name:ASC',
    id: 'api-tokens',
    isDisplayed: false,
    permissions: adminPermissions.settings['api-tokens'].main,
  },
  {
    intlLabel: { id: 'Settings.license.title', defaultMessage: 'License Activation' },
    to: '/settings/license',
    id: 'license',
    isDisplayed: false,
    permissions: adminPermissions.settings.license.main,
  },
];

export default defaultGlobalLinks;
