import reducer, { initialState } from '../reducer';

describe('LanguageProvider | reducer', () => {
  let state;

  beforeEach(() => {
    state = initialState;
  });

  it('should return the initialState', () => {
    const action = { type: undefined };

    expect(reducer(state, action)).toEqual(initialState);
  });

  it('should change the locale  correctly when the locale is defined in the localeNames', () => {
    state = {
      localeNames: { en: 'English', fr: 'Français' },
      locale: 'en',
    };

    const action = { type: 'CHANGE_LOCALE', locale: 'fr' };
    const expected = {
      localeNames: { en: 'English', fr: 'Français' },
      locale: 'fr',
    };

    expect(reducer(state, action)).toEqual(expected);
  });

  it('should not change the locale when the language is not defined in the localeNames', () => {
    state = {
      localeNames: { en: 'English', fr: 'Français' },
      locale: 'en',
    };

    const action = { type: 'CHANGE_LOCALE', locale: 'foo' };

    expect(reducer(state, action)).toEqual(state);
  });
});
