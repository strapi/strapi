const matchingLinks = [
  {
    pathname: '/content-manager',
    link: 'https://docs.strapi.io/user-docs/content-manager',
    title: 'Content Manager',
  },
  {
    pathname: '/content-type-builder',
    link: 'https://docs.strapi.io/user-docs/content-type-builder',
    title: 'Content-Type Builder',
  },
  {
    pathname: '/plugins/upload',
    link: 'https://docs.strapi.io/user-docs/media-library',
    title: 'Media Library',
  },
  {
    pathname: '/content-releases',
    link: 'https://docs.strapi.io/user-docs/releases/introduction',
    title: 'Releases',
  },
  {
    pathname: '/purchase-content-releases',
    link: 'https://docs.strapi.io/user-docs/releases/introduction',
    title: 'Releases',
  },
  {
    pathname: '/plugins/documentation',
    link: 'https://docs.strapi.io/dev-docs/plugins/documentation',
    title: 'Documentation plugin',
  },
  {
    pathname: '/list-plugins',
    link: 'https://docs.strapi.io/dev-docs/plugins',
    title: 'Plugins',
  },
  {
    pathname: '/marketplace',
    link: 'https://docs.strapi.io/user-docs/plugins/installing-plugins-via-marketplace',
    title: 'Marketplace',
  },
  {
    pathname: '/settings/application-infos',
    link: 'https://docs.strapi.io/user-docs/settings/introduction',
    title: 'General settings',
  },
  {
    pathname: '/settings/api-tokens',
    link: 'https://docs.strapi.io/user-docs/settings/API-tokens',
    title: 'API Tokens settings',
  },
  {
    pathname: '/settings/documentation',
    link: 'https://docs.strapi.io/dev-docs/plugins/documentation',
    title: 'Documentation plugin settings',
  },
  {
    pathname: '/settings/internationalization',
    link: 'https://docs.strapi.io/user-docs/settings/internationalization',
    title: 'Internationalization settings (i18n)',
  },
  {
    pathname: '/settings/media-library',
    link: 'https://docs.strapi.io/user-docs/settings/media-library-settings',
    title: 'Media Library settings',
  },
  {
    pathname: '/settings/review-workflows',
    link: 'https://docs.strapi.io/user-docs/settings/review-workflows',
    title: 'Review Workflows settings',
  },
  {
    pathname: '/settings/purchase-review-workflows',
    link: 'https://docs.strapi.io/user-docs/settings/review-workflows',
    title: 'Review Workflows settings',
  },
  {
    pathname: '/settings/single-sign-on',
    link: 'https://docs.strapi.io/user-docs/settings/single-sign-on',
    title: 'SSO settings',
  },
  {
    pathname: '/settings/purchase-single-sign-on',
    link: 'https://docs.strapi.io/user-docs/settings/single-sign-on',
    title: 'SSO settings',
  },
  {
    pathname: '/settings/purchase-content-history',
    link: 'https://docs.strapi.io/cms/features/content-history',
    title: 'Content History',
  },
  {
    pathname: '/settings/transfer-tokens',
    link: 'https://docs.strapi.io/user-docs/settings/transfer-tokens',
    title: 'Transfer Tokens',
  },
  {
    pathname: '/settings/webhooks',
    link: 'https://docs.strapi.io/dev-docs/backend-customization/webhooks',
    title: 'Webhooks',
  },
  {
    pathname: '/settings/roles',
    link: 'https://docs.strapi.io/user-docs/users-roles-permissions/configuring-administrator-roles',
    title: 'Users & Permissions',
  },
  {
    pathname: '/settings/users',
    link: 'https://docs.strapi.io/user-docs/users-roles-permissions/managing-administrators',
    title: 'Users & Permissions',
  },
  {
    pathname: '/settings/audit-logs',
    link: 'https://docs.strapi.io/user-docs/settings/audit-logs',
    title: 'Audit Logs',
  },
  {
    pathname: '/settings/purchase-audit-logs',
    link: 'https://docs.strapi.io/user-docs/settings/audit-logs',
    title: 'Audit Logs',
  },
  {
    pathname: '/settings/email',
    link: 'https://docs.strapi.io/dev-docs/plugins/email',
    title: 'Email plugin',
  },
  {
    pathname: '/settings/users-permissions/roles',
    link: 'https://docs.strapi.io/user-docs/users-roles-permissions/configuring-end-users-roles',
    title: 'End-users roles',
  },
  {
    pathname: '/settings/users-permissions/providers',
    link: 'https://docs.strapi.io/user-docs/settings/configuring-users-permissions-plugin-settings#configuring-providers',
    title: 'Providers',
  },
  {
    pathname: '/settings/users-permissions/email-templates',
    link: 'https://docs.strapi.io/user-docs/settings/configuring-users-permissions-plugin-settings#configuring-email-templates',
    title: 'Email Templates',
  },
  {
    pathname: '/settings/users-permissions/advanced-settings',
    link: 'https://docs.strapi.io/user-docs/settings/configuring-users-permissions-plugin-settings#configuring-advanced-settings',
    title: 'U&P Advanced settings',
  },
  {
    pathname: '/me',
    link: 'https://docs.strapi.io/user-docs/getting-started/setting-up-admin-panel#setting-up-your-administrator-profile',
    title: 'Administrator profile',
  },
];

export async function getMatchingDocLink(pathname: string) {
  const result =
    matchingLinks.find((item) => pathname === item.pathname) ||
    matchingLinks.find((item) => pathname.includes(item.pathname));

  if (!result) {
    return null;
  }
  return { ...result };
}
