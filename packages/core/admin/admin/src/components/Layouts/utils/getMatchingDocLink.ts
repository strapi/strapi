import { matchRoutes, RouteObject } from 'react-router-dom';

export interface DocLink {
  link: string;
  title: string;
  path: string;
}

type DocRoute = RouteObject & { link: string; title: string };

const matchingLinks: DocRoute[] = [
  {
    path: '/content-manager/*',
    link: 'https://docs.strapi.io/cms/features/content-manager',
    title: 'Content Manager',
  },
  {
    path: '/plugins/content-type-builder/*',
    link: 'https://docs.strapi.io/cms/features/content-type-builder',
    title: 'Content-Type Builder',
  },
  {
    path: '/plugins/upload/*',
    link: 'https://docs.strapi.io/cms/features/media-library',
    title: 'Media Library',
  },
  {
    path: '/plugins/content-releases/*',
    link: 'https://docs.strapi.io/cms/features/releases',
    title: 'Releases',
  },
  {
    path: '/settings/purchase-content-releases/*',
    link: 'https://docs.strapi.io/cms/features/releases',
    title: 'Releases',
  },
  {
    path: '/plugins/documentation/*',
    link: 'https://docs.strapi.io/cms/plugins/documentation',
    title: 'Documentation plugin',
  },
  {
    path: '/settings/list-plugins/*',
    link: 'https://docs.strapi.io/cms/plugins-development/developing-plugins',
    title: 'Plugins',
  },
  {
    path: '/settings/application-infos/*',
    link: 'https://docs.strapi.io/cms/features/admin-panel',
    title: 'General settings',
  },
  {
    path: '/settings/api-tokens/*',
    link: 'https://docs.strapi.io/cms/features/api-tokens',
    title: 'API Tokens settings',
  },
  {
    path: '/settings/documentation/*',
    link: 'https://docs.strapi.io/cms/plugins/documentation',
    title: 'Documentation plugin settings',
  },
  {
    path: '/settings/internationalization/*',
    link: 'https://docs.strapi.io/cms/features/internationalization#settings',
    title: 'Internationalization settings (i18n)',
  },
  {
    path: '/settings/media-library/*',
    link: 'https://docs.strapi.io/cms/features/media-library#configuration',
    title: 'Media Library settings',
  },
  {
    path: '/settings/review-workflows/*',
    link: 'https://docs.strapi.io/cms/features/review-workflows',
    title: 'Review Workflows settings',
  },
  {
    path: '/settings/purchase-review-workflows/*',
    link: 'https://docs.strapi.io/cms/features/review-workflows',
    title: 'Review Workflows settings',
  },
  {
    path: '/settings/single-sign-on/*',
    link: 'https://docs.strapi.io/cms/features/sso',
    title: 'SSO settings',
  },
  {
    path: '/settings/purchase-single-sign-on/*',
    link: 'https://docs.strapi.io/cms/features/sso',
    title: 'SSO settings',
  },
  {
    path: '/settings/purchase-content-history/*',
    link: 'https://docs.strapi.io/cms/features/content-history',
    title: 'Content History',
  },
  {
    path: '/settings/transfer-tokens/*',
    link: 'https://docs.strapi.io/cms/features/data-management',
    title: 'Transfer Tokens',
  },
  {
    path: '/settings/webhooks/*',
    link: 'https://docs.strapi.io/cms/backend-customization/webhooks',
    title: 'Webhooks',
  },
  {
    path: '/settings/roles/*',
    link: 'https://docs.strapi.io/cms/features/rbac#configuration',
    title: 'Users & Permissions',
  },
  {
    path: '/settings/users/*',
    link: 'https://docs.strapi.io/cms/features/rbac#usage',
    title: 'Users & Permissions',
  },
  {
    path: '/settings/audit-logs/*',
    link: 'https://docs.strapi.io/cms/features/audit-logs',
    title: 'Audit Logs',
  },
  {
    path: '/settings/purchase-audit-logs/*',
    link: 'https://docs.strapi.io/cms/features/audit-logs',
    title: 'Audit Logs',
  },
  {
    path: '/settings/email/*',
    link: 'https://docs.strapi.io/cms/features/email',
    title: 'Email plugin',
  },
  {
    path: '/settings/users-permissions/roles/*',
    link: 'https://docs.strapi.io/cms/features/users-permissions',
    title: 'End-users roles',
  },
  {
    path: '/settings/users-permissions/providers/*',
    link: 'https://docs.strapi.io/cms/features/users-permissions#providers',
    title: 'Providers',
  },
  {
    path: '/settings/users-permissions/email-templates/*',
    link: 'https://docs.strapi.io/cms/features/users-permissions#email-templates',
    title: 'Email Templates',
  },
  {
    path: '/settings/users-permissions/advanced-settings/*',
    link: 'https://docs.strapi.io/cms/features/users-permissions#advanced-settings',
    title: 'U&P Advanced settings',
  },
  {
    path: '/me/*',
    link: 'https://docs.strapi.io/cms/features/admin-panel#modifying-profile-information-name-email-username',
    title: 'Administrator profile',
  },
];

export function getMatchingDocLink(pathname: string): DocLink | null {
  const matches = matchRoutes(matchingLinks, pathname);
  const match = matches?.[0];

  if (!match) {
    return null;
  }

  const { link, title } = match.route;
  return { path: match.pathnameBase, link, title };
}
