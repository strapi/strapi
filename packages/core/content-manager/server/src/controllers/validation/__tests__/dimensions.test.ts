import { getDocumentLocaleAndStatus } from '../dimensions';

describe('getDocumentDimensions', () => {
  test('invalid status', () => {
    expect(() =>
      getDocumentLocaleAndStatus({ locale: 'en', status: 'notAStatus' })
    ).rejects.toThrow();
  });

  test('invalid locale - string array when not supported', () => {
    expect(() =>
      // Multiple locales are not supported here
      getDocumentLocaleAndStatus({ locale: ['en', 'fr'], status: 'draft' })
    ).rejects.toThrow();
  });

  test('invalid locale - mixed array', () => {
    expect(() =>
      getDocumentLocaleAndStatus(
        // Numbers are not allowed as locales
        { locale: ['en', 'fr', 123], status: 'published' },
        { allowMultipleLocales: true }
      )
    ).rejects.toThrow();
  });

  test('neither status or locale are required', () => {
    expect(getDocumentLocaleAndStatus({})).resolves.toEqual({});
  });
});
