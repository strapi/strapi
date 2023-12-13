import {
  AppState,
  reducer,
  setAdminPermissions,
  setAppTheme,
  setAvailableThemes,
  setLocale,
} from '../reducer';

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
      }
    `);
  });

  describe('permissions', () => {
    it('should set the permissions if there is no current state', () => {
      expect(
        reducer(
          undefined,
          setAdminPermissions({
            contentManager: {
              main: [{ action: 'plugins::content-manager.explorer.create' }],
              collectionTypesConfigurations: [
                { action: 'plugin::content-manager.collection-types.configure-view' },
              ],

              singleTypesConfigurations: [
                { action: 'plugin::content-manager.single-types.configure-view' },
              ],

              componentsConfigurations: [
                { action: 'plugin::content-manager.components.configure-layout' },
              ],
            },
          })
        )
      ).toMatchInlineSnapshot(`
        {
          "language": {
            "locale": "en",
            "localeNames": {
              "en": "English",
            },
          },
          "permissions": {
            "contentManager": {
              "collectionTypesConfigurations": [
                {
                  "action": "plugin::content-manager.collection-types.configure-view",
                },
              ],
              "componentsConfigurations": [
                {
                  "action": "plugin::content-manager.components.configure-layout",
                },
              ],
              "main": [
                {
                  "action": "plugins::content-manager.explorer.create",
                },
              ],
              "singleTypesConfigurations": [
                {
                  "action": "plugin::content-manager.single-types.configure-view",
                },
              ],
            },
          },
          "theme": {
            "availableThemes": [],
            "currentTheme": "system",
          },
        }
      `);
    });

    it('should overwrite any existing permissions when we set new ones', () => {
      const previousState: AppState = {
        language: {
          locale: 'en',
          localeNames: { en: 'English' },
        },
        permissions: {
          contentManager: {
            main: [{ action: 'plugins::content-manager.explorer.create' }],
            collectionTypesConfigurations: [
              { action: 'plugin::content-manager.collection-types.configure-view' },
            ],

            singleTypesConfigurations: [
              { action: 'plugin::content-manager.single-types.configure-view' },
            ],

            componentsConfigurations: [
              { action: 'plugin::content-manager.components.configure-layout' },
            ],
          },
        },
        theme: {
          availableThemes: [],
          currentTheme: 'system',
        },
      };

      expect(
        reducer(
          previousState,
          setAdminPermissions({
            contentManager: {
              main: [],
              collectionTypesConfigurations: [],
              singleTypesConfigurations: [],
              componentsConfigurations: [],
            },
          })
        )
      ).toMatchInlineSnapshot(`
        {
          "language": {
            "locale": "en",
            "localeNames": {
              "en": "English",
            },
          },
          "permissions": {
            "contentManager": {
              "collectionTypesConfigurations": [],
              "componentsConfigurations": [],
              "main": [],
              "singleTypesConfigurations": [],
            },
          },
          "theme": {
            "availableThemes": [],
            "currentTheme": "system",
          },
        }
      `);
    });
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
        }
      `);
    });
  });
});
