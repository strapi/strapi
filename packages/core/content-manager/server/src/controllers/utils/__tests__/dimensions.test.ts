import { getDocumentLocaleAndStatus } from '../dimensions';

describe('getDocumentDimensions', () => {
  test('invalid locale', () => {
    expect(() => getDocumentLocaleAndStatus({ locale: 'invalid', status: 'draft' })).toThrow();
  });

  test('invalid status', () => {
    expect(() => getDocumentLocaleAndStatus({ locale: 'en', status: 'notAStatus' })).toThrow();
  });
});
