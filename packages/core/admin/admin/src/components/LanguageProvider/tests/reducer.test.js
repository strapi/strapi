import reducer, { initialState } from '../reducer';
import './LocaleStorageMock';

describe('LanguageProvider | reducer', () => {
  let state;

  beforeEach(() => {
    state = initialState;
  });

  afterEach(() => {
    localStorage.removeItem('strapi-admin-language');
  });

  it('should return the initialState', () => {
    const action = { type: undefined };
    expect(reducer(state, action)).toEqual(initialState);
  });

  it('should change the locale and set the localStorage correctly when the locale is defined in the localesNativeNames', () => {
    state = {
      localesNativeNames: { en: 'English', fr: 'Français' },
      locale: 'en',
    };

    const action = { type: 'CHANGE_LOCALE', locale: 'fr' };
    const expected = {
      localesNativeNames: { en: 'English', fr: 'Français' },
      locale: 'fr',
    };

    expect(reducer(state, action)).toEqual(expected);
    expect(localStorage.getItem('strapi-admin-language')).toEqual('fr');
  });

  it('should not change the locale when the language is not defined in the localesNativeNames', () => {
    localStorage.setItem('strapi-admin-language', 'en');

    state = {
      localesNativeNames: { en: 'English', fr: 'Français' },
      locale: 'en',
    };

    const action = { type: 'CHANGE_LOCALE', locale: 'foo' };

    expect(reducer(state, action)).toEqual(state);
    expect(localStorage.getItem('strapi-admin-language')).toEqual('en');
  });
});
