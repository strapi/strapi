const routes = [];

if (strapi.features.isEnabled(strapi.features.SSO)) {
  routes.push({
    async Component() {
      const component = await import(
        /* webpackChunkName: "sso-settings-page" */ '../pages/SingleSignOn'
      );

      return component;
    },
    to: '/settings/single-sign-on',
    exact: true,
  });
}

export default routes;
