/*
 *
 * LanguageProvider reducer
 *
 */

const localStorageKey = 'strapi-admin-language';

const initialState = {
  localesNativeNames: {},
  locale: 'en',
};

const languageProviderReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'CHANGE_LOCALE': {
      const { locale } = action;

      if (!state.localesNativeNames[locale]) {
        return state;
      }

      // Set user language in local storage.
      window.localStorage.setItem(localStorageKey, locale);

      return { ...state, locale };
    }
    default: {
      return state;
    }
  }
};

export default languageProviderReducer;
export { initialState };
