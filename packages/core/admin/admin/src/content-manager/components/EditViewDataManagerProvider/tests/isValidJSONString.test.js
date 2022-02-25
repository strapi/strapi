import isValidJSONString from '../utils/isValidJSONString';

describe('CONTENT MANAGER | COMPONENTS | EditViewDataManagerProvider | isValidJSONString', () => {
  it.each([
    ['"coucou"', true],
    ['"cou\\" \\"cou"', true],
    ['"coucou', false],
    ['"cou" "cou"', false],
    ['{}', false],
    ['null', false],
    ['', false],
    ['[]', false],
  ])('%s is a JSON string: %s', (value, expectedResult) => {
    const result = isValidJSONString(value);
    expect(result).toBe(expectedResult);
  });
});
