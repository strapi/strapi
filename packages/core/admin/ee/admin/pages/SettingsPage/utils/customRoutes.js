import SingleSignOn from '../SingleSignOn';

const ssoRoutes = process.env.STRAPI_ADMIN_ENABLED_EE_FEATURES.includes('sso')
  ? [
      {
        Component: SingleSignOn,
        to: '/settings/single-sign-on',
        exact: true,
      },
    ]
  : [];

const customRoutes = [...ssoRoutes];

export default customRoutes;
