const matchingLinks = [
  {
    route: '/content-manager',
    link: 'https://docs.strapi.io/user-docs/content-manager',
    title: 'Content Manager',
  },
  {
    route: '/content-type-builder',
    link: 'https://docs.strapi.io/user-docs/content-type-builder',
    title: 'Content-Type Builder',
  },
  {
    route: '/plugins/upload',
    link: 'https://docs.strapi.io/user-docs/media-library',
    title: 'Media Library',
  },
  {
    route: '/content-releases',
    link: 'https://docs.strapi.io/user-docs/releases/introduction',
    title: 'Releases',
  },
  {
    route: '/purchase-content-releases',
    link: 'https://docs.strapi.io/user-docs/releases/introduction',
    title: 'Releases',
  },
  {
    route: '/plugins/documentation',
    link: 'https://docs.strapi.io/dev-docs/plugins/documentation',
    title: 'Documentation plugin',
  },
  {
    route: '/list-plugins',
    link: 'https://docs.strapi.io/dev-docs/plugins',
    title: 'Plugins',
  },
  {
    route: '/marketplace',
    link: 'https://docs.strapi.io/user-docs/plugins/installing-plugins-via-marketplace',
    title: 'Marketplace',
  },
  {
    route: '/settings/application-infos',
    link: 'https://docs.strapi.io/user-docs/settings/introduction',
    title: 'General settings',
  },
  {
    route: '/settings/api-tokens',
    link: 'https://docs.strapi.io/user-docs/settings/API-tokens',
    title: 'API Tokens settings',
  },
  {
    route: '/settings/documentation',
    link: 'https://docs.strapi.io/dev-docs/plugins/documentation',
    title: 'Documentation plugin settings',
  },
  {
    route: '/settings/internationalization',
    link: 'https://docs.strapi.io/user-docs/settings/internationalization',
    title: 'Internationalization settings (i18n)',
  },
  {
    route: '/settings/media-library',
    link: 'https://docs.strapi.io/user-docs/settings/media-library-settings',
    title: 'Media Library settings',
  },
  {
    route: '/settings/review-workflows',
    link: 'https://docs.strapi.io/user-docs/settings/review-workflows',
    title: 'Review Workflows settings',
  },
  {
    route: '/settings/purchase-review-workflows',
    link: 'https://docs.strapi.io/user-docs/settings/review-workflows',
    title: 'Review Workflows settings',
  },
  {
    route: '/settings/single-sign-on',
    link: 'https://docs.strapi.io/user-docs/settings/single-sign-on',
    title: 'SSO settings',
  },
  {
    route: '/settings/purchase-single-sign-on',
    link: 'https://docs.strapi.io/user-docs/settings/single-sign-on',
    title: 'SSO settings',
  },
  {
    route: '/settings/transfer-tokens',
    link: 'https://docs.strapi.io/user-docs/settings/transfer-tokens',
    title: 'Transfer Tokens',
  },
  {
    route: '/settings/webhooks',
    link: 'https://docs.strapi.io/dev-docs/backend-customization/webhooks',
    title: 'Webhooks',
  },
  {
    route: '/settings/roles',
    link: 'https://docs.strapi.io/user-docs/users-roles-permissions/configuring-administrator-roles',
    title: 'Users & Permissions',
  },
  {
    route: '/settings/users',
    link: 'https://docs.strapi.io/user-docs/users-roles-permissions/managing-administrators',
    title: 'Users & Permissions',
  },
  {
    route: '/settings/audit-logs',
    link: 'https://docs.strapi.io/user-docs/settings/audit-logs',
    title: 'Audit Logs',
  },
  {
    route: '/settings/purchase-audit-logs',
    link: 'https://docs.strapi.io/user-docs/settings/audit-logs',
    title: 'Audit Logs',
  },
  {
    route: '/settings/email',
    link: 'https://docs.strapi.io/dev-docs/plugins/email',
    title: 'Email plugin',
  },
  {
    route: '/settings/users-permissions/roles',
    link: 'https://docs.strapi.io/user-docs/users-roles-permissions/configuring-end-users-roles',
    title: 'End-users roles',
  },
  {
    route: '/settings/users-permissions/providers',
    link: 'https://docs.strapi.io/user-docs/settings/configuring-users-permissions-plugin-settings#configuring-providers',
    title: 'Providers',
  },
  {
    route: '/settings/users-permissions/email-templates',
    link: 'https://docs.strapi.io/user-docs/settings/configuring-users-permissions-plugin-settings#configuring-email-templates',
    title: 'Email Templates',
  },
  {
    route: '/settings/users-permissions/advanced-settings',
    link: 'https://docs.strapi.io/user-docs/settings/configuring-users-permissions-plugin-settings#configuring-advanced-settings',
    title: 'U&P Advanced settings',
  },
  {
    route: '/me',
    link: 'https://docs.strapi.io/user-docs/getting-started/setting-up-admin-panel#setting-up-your-administrator-profile',
    title: 'Administrator profile',
  },
];

const defaultDescription = 'Get set up in minutes to build any projects in hours instead of weeks.';

async function getDocumentationLinkMetaDescription(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const htmlText = await response.text();

    // Parse the HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    // Extract the meta description
    const metaDescription = doc.querySelector('meta[name="description"]');
    const description = metaDescription?.getAttribute('content') || defaultDescription;

    return description.length > 180 ? `${description.slice(0, 180)}... Learn more` : description;
  } catch (error) {
    console.error('Error fetching the meta description:', error);
    return defaultDescription;
  }
}

export async function getOnboardingDocLink(pathname: string) {
  const result =
    matchingLinks.find((item) => pathname === item.route) ||
    matchingLinks.find((item) => pathname.includes(item.route));

  if (!result) {
    return null;
  }

  const description = await getDocumentationLinkMetaDescription(result.link);
  return { ...result, description };
}
