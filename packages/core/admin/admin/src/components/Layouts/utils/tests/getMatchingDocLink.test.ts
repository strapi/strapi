import { getMatchingDocLink } from '../getMatchingDocLink';

describe('getMatchingDocLink', () => {
  it('returns null for unmapped admin routes', () => {
    expect(getMatchingDocLink('/')).toBeNull();
    expect(getMatchingDocLink('/settings/admin-tokens')).toBeNull();
  });

  it('matches content manager routes', () => {
    expect(getMatchingDocLink('/content-manager/collection-types/api::article.article')).toEqual({
      path: '/content-manager',
      link: 'https://docs.strapi.io/cms/features/content-manager',
      title: 'Content Manager',
    });
  });

  it('prefers more specific settings paths over shared prefixes', () => {
    expect(getMatchingDocLink('/settings/users-permissions/providers')).toEqual({
      path: '/settings/users-permissions/providers',
      link: 'https://docs.strapi.io/cms/features/users-permissions#providers',
      title: 'Providers',
    });

    expect(getMatchingDocLink('/settings/users/1')).toEqual({
      path: '/settings/users',
      link: 'https://docs.strapi.io/cms/features/rbac#usage',
      title: 'Users & Permissions',
    });

    expect(getMatchingDocLink('/settings/roles/1')).toEqual({
      path: '/settings/roles',
      link: 'https://docs.strapi.io/cms/features/rbac#configuration',
      title: 'Users & Permissions',
    });
  });

  it('matches plugin routes under /plugins', () => {
    expect(getMatchingDocLink('/plugins/content-type-builder/content-types')).toEqual({
      path: '/plugins/content-type-builder',
      link: 'https://docs.strapi.io/cms/features/content-type-builder',
      title: 'Content-Type Builder',
    });
  });

  it('matches profile route', () => {
    expect(getMatchingDocLink('/me')).toEqual({
      path: '/me',
      link: 'https://docs.strapi.io/cms/features/admin-panel#modifying-profile-information-name-email-username',
      title: 'Administrator profile',
    });
  });
});
