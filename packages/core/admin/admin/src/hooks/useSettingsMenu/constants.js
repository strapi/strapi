export const LINKS_CE = {
  global: [
    {
      intlLabel: { id: 'Settings.application.title', defaultMessage: 'Overview' },
      to: '/settings/application-infos',
      id: '000-application-infos',
      permissions: [],
    },
    {
      intlLabel: { id: 'Settings.webhooks.title', defaultMessage: 'Webhooks' },
      to: '/settings/webhooks',
      id: 'webhooks',
    },
    {
      intlLabel: { id: 'Settings.apiTokens.title', defaultMessage: 'API Tokens' },
      to: '/settings/api-tokens?sort=name:ASC',
      id: 'api-tokens',
    },
    {
      intlLabel: { id: 'Settings.transferTokens.title', defaultMessage: 'Transfer Tokens' },
      to: '/settings/transfer-tokens?sort=name:ASC',
      id: 'transfer-tokens',
    },
  ],

  admin: [
    {
      intlLabel: { id: 'global.roles', defaultMessage: 'Roles' },
      to: '/settings/roles',
      id: 'roles',
    },
    {
      intlLabel: { id: 'global.users' },
      // Init the search params directly
      to: '/settings/users?pageSize=10&page=1&sort=firstname',
      id: 'users',
    },
  ],
};
