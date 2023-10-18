/*
 *
 * LanguageProvider
 *
 * this component connects the redux state language locale to the
 * IntlProvider component and i18n messages (loaded from `app/translations`)
 */

import * as React from 'react';

import defaultsDeep from 'lodash/defaultsDeep';
import { IntlProvider } from 'react-intl';

/* -------------------------------------------------------------------------------------------------
 * LocalesContext
 * -----------------------------------------------------------------------------------------------*/

interface LocalesContextValue {
  changeLocale: (locale: keyof State['localeNames']) => void;
  localeNames: Record<string, string>;
}

const LocalesContext = React.createContext<LocalesContextValue>({
  changeLocale: () => {
    throw new Error('LocalesContext: changeLocale() is not implemented');
  },
  localeNames: {},
});

const useLocales = () => React.useContext(LocalesContext);

/* -------------------------------------------------------------------------------------------------
 * LanguageProvider
 * -----------------------------------------------------------------------------------------------*/

const LANGUAGE_LOCAL_STORAGE_KEY = 'strapi-admin-language';

interface LanguageProviderProps {
  children: React.ReactNode;
  localeNames: Record<string, string>;
  messages: Record<string, Record<string, string>>;
}

const LanguageProvider = ({ children, localeNames, messages }: LanguageProviderProps) => {
  const [{ locale }, dispatch] = React.useReducer<React.Reducer<State, Action>, State>(
    reducer,
    initialState,
    () => {
      const languageFromLocaleStorage = window.localStorage.getItem(LANGUAGE_LOCAL_STORAGE_KEY);
      if (languageFromLocaleStorage && localeNames[languageFromLocaleStorage]) {
        return {
          locale: languageFromLocaleStorage,
          localeNames,
        };
      } else {
        return {
          locale: 'en',
          localeNames,
        };
      }
    }
  );

  React.useEffect(() => {
    // Set user language in local storage.
    window.localStorage.setItem(LANGUAGE_LOCAL_STORAGE_KEY, locale);
    document.documentElement.setAttribute('lang', locale);
  }, [locale]);

  const changeLocale = React.useCallback((locale: keyof State['localeNames']) => {
    dispatch({
      type: 'CHANGE_LOCALE',
      locale,
    });
  }, []);

  const appMessages = defaultsDeep(messages[locale], messages.en);

  const contextValue = React.useMemo(
    () => ({ changeLocale, localeNames }),
    [changeLocale, localeNames]
  );

  return (
    <IntlProvider locale={locale} defaultLocale="en" messages={appMessages} textComponent="span">
      <LocalesContext.Provider value={contextValue}>{children}</LocalesContext.Provider>
    </IntlProvider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Reducer
 * -----------------------------------------------------------------------------------------------*/

interface State {
  localeNames: Record<string, string>;
  locale: keyof State['localeNames'];
}

const initialState: State = {
  localeNames: { en: 'English' },
  locale: 'en',
};

interface ChangeLocaleAction {
  type: 'CHANGE_LOCALE';
  locale: keyof State['localeNames'];
}

type Action = ChangeLocaleAction;

const reducer = (state = initialState, action: Action) => {
  switch (action.type) {
    case 'CHANGE_LOCALE': {
      const { locale } = action;

      if (!state.localeNames[locale]) {
        return state;
      }

      return { ...state, locale };
    }
    default: {
      return state;
    }
  }
};

export { LanguageProvider, useLocales, LANGUAGE_LOCAL_STORAGE_KEY };
export type { LanguageProviderProps, LocalesContextValue };
