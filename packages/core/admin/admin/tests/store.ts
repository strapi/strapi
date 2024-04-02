import { fixtures } from '@strapi/admin-test-utils';

/**
 * This is for the redux store in `utils`.
 * The more we adopt it, the bigger it will get – which is okay.
 */
const initialState = {
  admin_app: {
    language: {
      locale: 'en',
      localeNames: { en: 'English' },
    },
    permissions: fixtures.permissions.app,
    theme: {
      availableThemes: [],
      currentTheme: 'light',
    },
  },
};

export { initialState };
