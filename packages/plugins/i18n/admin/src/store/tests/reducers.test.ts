import { ADD_LOCALE, DELETE_LOCALE, RESOLVE_LOCALES, UPDATE_LOCALE } from '../constants';
import { Locale, initialState, reducers } from '../reducers';

describe('i18n reducer', () => {
  const FRENCH_LOCALE = {
    id: 1,
    code: 'fr',
    name: 'French',
    isDefault: false,
    createdAt: '',
    updatedAt: '',
  } satisfies Locale;

  const ENGLISH_LOCALE = {
    id: 2,
    code: 'en',
    name: 'English',
    isDefault: true,
    createdAt: '',
    updatedAt: '',
  } satisfies Locale;

  it('resolves the initial state when the action is not known', () => {
    const action = {
      type: 'UNKNWON_ACTION',
    };

    // @ts-expect-error – testing a bad action
    const actual = reducers.i18n_locales(initialState, action);

    expect(actual).toEqual(initialState);
  });

  it('resolves a list of locales when triggering RESOLVE_LOCALES', () => {
    const actual = reducers.i18n_locales(initialState, {
      type: RESOLVE_LOCALES,
      locales: [FRENCH_LOCALE, ENGLISH_LOCALE],
    });

    expect(actual).toMatchInlineSnapshot(`
      {
        "isLoading": false,
        "locales": [
          {
            "code": "fr",
            "createdAt": "",
            "id": 1,
            "isDefault": false,
            "name": "French",
            "updatedAt": "",
          },
          {
            "code": "en",
            "createdAt": "",
            "id": 2,
            "isDefault": true,
            "name": "English",
            "updatedAt": "",
          },
        ],
      }
    `);
  });

  it('adds a locale when triggering ADD_LOCALE', () => {
    const actual = reducers.i18n_locales(
      { ...initialState, locales: [ENGLISH_LOCALE] },
      {
        type: ADD_LOCALE,
        newLocale: FRENCH_LOCALE,
      }
    );

    expect(actual).toMatchInlineSnapshot(`
      {
        "isLoading": true,
        "locales": [
          {
            "code": "en",
            "createdAt": "",
            "id": 2,
            "isDefault": true,
            "name": "English",
            "updatedAt": "",
          },
          {
            "code": "fr",
            "createdAt": "",
            "id": 1,
            "isDefault": false,
            "name": "French",
            "updatedAt": "",
          },
        ],
      }
    `);
  });

  it('removes a locale when triggering DELETE_LOCALE ', () => {
    const actual = reducers.i18n_locales(
      { ...initialState, locales: [ENGLISH_LOCALE, FRENCH_LOCALE] },
      {
        type: DELETE_LOCALE,
        id: ENGLISH_LOCALE.id,
      }
    );

    expect(actual).toMatchInlineSnapshot(`
      {
        "isLoading": true,
        "locales": [
          {
            "code": "fr",
            "createdAt": "",
            "id": 1,
            "isDefault": false,
            "name": "French",
            "updatedAt": "",
          },
        ],
      }
    `);
  });

  it('updates a locale when triggering UPDATE_LOCALE', () => {
    const actual = reducers.i18n_locales(
      { ...initialState, locales: [ENGLISH_LOCALE, FRENCH_LOCALE] },
      {
        type: UPDATE_LOCALE,
        editedLocale: { ...FRENCH_LOCALE, name: 'Frenchie', isDefault: true },
      }
    );

    expect(actual).toMatchInlineSnapshot(`
      {
        "isLoading": true,
        "locales": [
          {
            "code": "en",
            "createdAt": "",
            "id": 2,
            "isDefault": false,
            "name": "English",
            "updatedAt": "",
          },
          {
            "code": "fr",
            "createdAt": "",
            "id": 1,
            "isDefault": true,
            "name": "Frenchie",
            "updatedAt": "",
          },
        ],
      }
    `);
  });
});
