import { getDocumentLocaleAndStatus } from '../dimensions';

describe('getDocumentDimensions', () => {
  test('invalid status', () => {
    expect(() => getDocumentLocaleAndStatus({ locale: 'en', status: 'notAStatus' })).toThrow();
  });
});
