import { reducer, setAppTheme, setAvailableThemes, setLocale } from '../reducer';

describe('admin_app reducer', () => {
  afterEach(() => {
    /**
     * Both the locale & theme are stored in localStorage.
     * We need to clear it after each test to avoid side effects.
     */
    window.localStorage.clear();
  });

  it('should return the initial state', () => {
    expect(reducer(undefined, { type: undefined })).toMatchInlineSnapshot(`
      {
        "language": {
          "locale": "en",
          "localeNames": {
            "en": "English",
          },
        },
        "permissions": {},
        "theme": {
          "availableThemes": [],
          "currentTheme": "system",
        },
        "token": null,
      }
    `);
  });

  describe('theme', () => {
    it('should set the theme', () => {
      expect(reducer(undefined, setAppTheme('dark'))).toMatchInlineSnapshot(`
        {
          "language": {
            "locale": "en",
            "localeNames": {
              "en": "English",
            },
          },
          "permissions": {},
          "theme": {
            "availableThemes": [],
            "currentTheme": "dark",
          },
          "token": null,
        }
      `);
    });

    it('should set the available themes', () => {
      expect(reducer(undefined, setAvailableThemes(['dark', 'light']))).toMatchInlineSnapshot(`
        {
          "language": {
            "locale": "en",
            "localeNames": {
              "en": "English",
            },
          },
          "permissions": {},
          "theme": {
            "availableThemes": [
              "dark",
              "light",
            ],
            "currentTheme": "system",
          },
          "token": null,
        }
      `);
    });
  });

  describe('language', () => {
    it('should set the locale', () => {
      expect(reducer(undefined, setLocale('fr'))).toMatchInlineSnapshot(`
        {
          "language": {
            "locale": "fr",
            "localeNames": {
              "en": "English",
            },
          },
          "permissions": {},
          "theme": {
            "availableThemes": [],
            "currentTheme": "system",
          },
          "token": null,
        }
      `);
    });
  });
});
