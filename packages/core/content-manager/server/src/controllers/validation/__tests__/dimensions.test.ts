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

  test('status = modifed is invalid', () => {
    expect(getDocumentLocaleAndStatus({ status: 'modified' })).rejects.toThrow();
  });

  test('valid status only', () => {
    expect(getDocumentLocaleAndStatus({ status: 'draft' })).resolves.toEqual({
      status: 'draft',
    });
  });

  test('valid locale only', () => {
    expect(getDocumentLocaleAndStatus({ locale: 'en' })).resolves.toEqual({ locale: 'en' });
  });

  test('valid status and locale', () => {
    expect(getDocumentLocaleAndStatus({ locale: 'en', status: 'published' })).resolves.toEqual({
      locale: 'en',
      status: 'published',
    });
  });
});
