import SingleSignOn from '../SingleSignOn';

const ssoRoutes = strapi.features.includes('sso')
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
