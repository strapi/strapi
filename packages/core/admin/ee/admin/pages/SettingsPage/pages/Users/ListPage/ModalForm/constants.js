export const FORM_INITIAL_VALUES = {
  ...(window.strapi.features.isEnabled(window.strapi.features.SSO)
    ? {
        useSSORegistration: true,
      }
    : {}),
};
