import SingleSignOn from '../SingleSignOn';

const ssoRoutes = strapi.features.isEnabled(strapi.features.SSO)
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
