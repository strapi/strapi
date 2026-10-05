import {
  getLocaleValidationErrorActionKeys,
  hasLocaleValidationErrors,
} from '../localePermissionValidation';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const action = (fields: Record<string, boolean>, locales?: Record<string, boolean>) => ({
  properties: {
    fields,
    ...(locales !== undefined && { locales }),
  },
  conditions: {},
});

const READ = 'plugin::content-manager.explorer.read';
const UPDATE = 'plugin::content-manager.explorer.update';
const DELETE = 'plugin::content-manager.explorer.delete';

// ---------------------------------------------------------------------------
// hasLocaleValidationErrors
// Answers: "should the Save button be disabled?"
// Scans all subjects across both collectionTypes and singleTypes.
// ---------------------------------------------------------------------------

describe('hasLocaleValidationErrors', () => {
  it('returns false when no content type has a locales property (non-i18n)', () => {
    const modifiedData = {
      collectionTypes: {
        'api::tag.tag': {
          [READ]: action({ name: true }),
        },
      },
      singleTypes: {},
      plugins: {},
      settings: {},
    };

    expect(hasLocaleValidationErrors(modifiedData)).toBe(false);
  });

  it('returns false when an i18n action is fully disabled (no field or locale selected)', () => {
    const modifiedData = {
      collectionTypes: {
        'api::article.article': {
          [UPDATE]: action({ title: false }, { en: false, fr: false }),
        },
      },
      singleTypes: {},
      plugins: {},
      settings: {},
    };

    expect(hasLocaleValidationErrors(modifiedData)).toBe(false);
  });

  it('returns false when every enabled i18n action has at least one locale selected', () => {
    const modifiedData = {
      collectionTypes: {
        'api::article.article': {
          [READ]: action({ title: true }, { en: true, fr: false }),
          [UPDATE]: action({ title: true }, { en: false, fr: true }),
        },
      },
      singleTypes: {},
      plugins: {},
      settings: {},
    };

    expect(hasLocaleValidationErrors(modifiedData)).toBe(false);
  });

  it('returns true when an enabled action has no locale selected', () => {
    const modifiedData = {
      collectionTypes: {
        'api::article.article': {
          [UPDATE]: action({ title: true }, { en: false, fr: false }),
        },
      },
      singleTypes: {},
      plugins: {},
      settings: {},
    };

    expect(hasLocaleValidationErrors(modifiedData)).toBe(true);
  });

  it('returns true when the error is in singleTypes, not collectionTypes', () => {
    const modifiedData = {
      collectionTypes: {},
      singleTypes: {
        'api::homepage.homepage': {
          [READ]: action({ title: true }, { en: false }),
        },
      },
      plugins: {},
      settings: {},
    };

    expect(hasLocaleValidationErrors(modifiedData)).toBe(true);
  });

  it('returns true even when only one subject out of many has an error', () => {
    const modifiedData = {
      collectionTypes: {
        'api::tag.tag': {
          [READ]: action({ name: true }),
        },
        'api::article.article': {
          [READ]: action({ title: true }, { en: true }),
          [DELETE]: action({ title: true }, { en: false, fr: false }),
        },
      },
      singleTypes: {},
      plugins: {},
      settings: {},
    };

    expect(hasLocaleValidationErrors(modifiedData)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getLocaleValidationErrorActionKeys
// Answers: "which action labels should the inline error mention for this subject?"
// ---------------------------------------------------------------------------

describe('getLocaleValidationErrorActionKeys', () => {
  it('returns an empty array when the subject has no locale validation errors', () => {
    const modifiedData = {
      collectionTypes: {
        'api::article.article': {
          [READ]: action({ title: true }, { en: true, fr: false }),
        },
      },
      singleTypes: {},
      plugins: {},
      settings: {},
    };

    expect(
      getLocaleValidationErrorActionKeys(modifiedData, 'collectionTypes', 'api::article.article')
    ).toEqual([]);
  });

  it('returns only the action keys that are enabled but have no locale selected', () => {
    const modifiedData = {
      collectionTypes: {
        'api::article.article': {
          [READ]: action({ title: true }, { en: true }),
          [UPDATE]: action({ title: true }, { en: false, fr: false }),
          [DELETE]: action({ title: false }, { en: false, fr: false }),
        },
      },
      singleTypes: {},
      plugins: {},
      settings: {},
    };

    expect(
      getLocaleValidationErrorActionKeys(modifiedData, 'collectionTypes', 'api::article.article')
    ).toEqual([UPDATE]);
  });

  it('returns an empty array for an unknown subject', () => {
    const modifiedData = {
      collectionTypes: {},
      singleTypes: {},
      plugins: {},
      settings: {},
    };

    expect(
      getLocaleValidationErrorActionKeys(modifiedData, 'collectionTypes', 'api::missing.missing')
    ).toEqual([]);
  });
});
