import SingleSignOn from '../SingleSignOn';

const ssoRoutes = ENABLED_EE_FEATURES.includes('sso')
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
