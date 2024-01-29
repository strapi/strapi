import { getDocumentDimensions } from '../dimensions';

describe('getDocumentDimensions', () => {
  test('invalid locale', () => {
    expect(() => getDocumentDimensions({ locale: 'invalid', status: 'draft' })).toThrow();
  });

  test('invalid status', () => {
    expect(() => getDocumentDimensions({ locale: 'en', status: 'notAStatus' })).toThrow();
  });
});
