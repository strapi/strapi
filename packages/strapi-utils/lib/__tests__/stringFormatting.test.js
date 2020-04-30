const { escapeQuery } = require('../stringFormatting');

describe('Escape Query', () => {
  const testData = [
    // [query, charsToEscape, escapeChar, expectedResult]
    ['123', '[%\\', '\\', '123'],
    ['12%3', '[%\\', '\\', '12\\%3'],
    ['1[2%3', '[%\\', '\\', '1\\[2\\%3'],
    ['1\\23', '[%\\', '\\', '1\\\\23'],
    ['123\\', '[%\\', '\\', '123\\\\'],
    ['\\', '[%\\', '\\', '\\\\'],
    ['123', '[%\\', '+', '123'],
    ['12%3', '[%\\', '+', '12+%3'],
    ['1[2%3', '[%\\', '+', '1+[2+%3'],
    ['1\\23', '[%\\', '+', '1+\\23'],
  ];

  test.each(testData)(
    'Escaping %s from %s with %s',
    (query, charsToEscape, escapeChar, expectedResult) => {
      const result = escapeQuery(query, charsToEscape, escapeChar);
      expect(result).toEqual(expectedResult);
    }
  );
});
