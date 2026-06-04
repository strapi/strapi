import {
  hasLocaleValidationErrors,
  hasLocaleValidationErrorForSubject,
} from '../localePermissionValidation';

describe('localePermissionValidation', () => {
  it('does not report errors when Internationalization is not set up for that content type', () => {
    const modifiedData = {
      collectionTypes: {
        'api::article.article': {
          'plugin::content-manager.explorer.read': {
            properties: {
              fields: { title: true },
            },
            conditions: {},
          },
        },
      },
      singleTypes: {},
      plugins: {},
      settings: {},
    };

    expect(hasLocaleValidationErrors(modifiedData)).toBe(false);
    expect(
      hasLocaleValidationErrorForSubject(modifiedData, 'collectionTypes', 'api::article.article')
    ).toBe(false);
  });

  it('does not report errors when no action is enabled', () => {
    const modifiedData = {
      collectionTypes: {
        'api::article.article': {
          'plugin::content-manager.explorer.read': {
            properties: {
              fields: { title: false },
              locales: { en: false, fr: false },
            },
            conditions: {},
          },
        },
      },
      singleTypes: {},
      plugins: {},
      settings: {},
    };

    expect(hasLocaleValidationErrors(modifiedData)).toBe(false);
  });

  it('reports errors when an enabled action has no locales selected', () => {
    const modifiedData = {
      collectionTypes: {
        'api::article.article': {
          'plugin::content-manager.explorer.read': {
            properties: {
              fields: { title: true },
              locales: { en: false, fr: false },
            },
            conditions: {},
          },
        },
      },
      singleTypes: {},
      plugins: {},
      settings: {},
    };

    expect(hasLocaleValidationErrors(modifiedData)).toBe(true);
    expect(
      hasLocaleValidationErrorForSubject(modifiedData, 'collectionTypes', 'api::article.article')
    ).toBe(true);
  });

  it('does not report errors when at least one locale is selected', () => {
    const modifiedData = {
      collectionTypes: {
        'api::article.article': {
          'plugin::content-manager.explorer.read': {
            properties: {
              fields: { title: true },
              locales: { en: true, fr: false },
            },
            conditions: {},
          },
        },
      },
      singleTypes: {},
      plugins: {},
      settings: {},
    };

    expect(hasLocaleValidationErrors(modifiedData)).toBe(false);
  });
});
