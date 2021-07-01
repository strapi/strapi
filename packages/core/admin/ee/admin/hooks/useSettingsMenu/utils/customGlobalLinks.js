import adminPermissions from '../../../../../admin/src/permissions';

const ssoGlobalRoutes = strapi.features.includes('sso')
  ? [
      {
        intlLabel: { id: 'Settings.sso.title', defaultMessage: 'Single Sign-On' },
        to: '/settings/single-sign-on',
        id: 'sso',
        isDisplayed: false,
        permissions: adminPermissions.settings.sso.main,
      },
    ]
  : [];

const customGlobalLinks = [...ssoGlobalRoutes];

export default customGlobalLinks;
