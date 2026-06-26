import BigIntegerField from '../fields/biginteger';
import NumberField from '../fields/number';

describe('numeric fields', () => {
  const numberField = new NumberField({});
  const bigIntegerField = new BigIntegerField({});

  test.each([
    [123, 123],
    ['123', 123],
    ['  123.45  ', 123.45],
    [-42, -42],
    ['-42', -42],
    [null, null],
    [undefined, undefined],
  ])('NumberField.toDB converts %p to %p', (input, expected) => {
    expect(numberField.toDB(input)).toBe(expected);
  });

  test.each(['900260056-1', '123abc', '', '   ', Infinity, 'Infinity', true, false, [], {}])(
    'NumberField.toDB rejects invalid input %p',
    (input) => {
      expect(() => numberField.toDB(input)).toThrow(/Expected a valid Number/);
    }
  );

  test.each([
    [123, '123'],
    ['123', '123'],
    ['  +123  ', '123'],
    ['-42', '-42'],
    ['00045', '45'],
    [123n, '123'],
    [null, null],
    [undefined, undefined],
  ])('BigIntegerField.toDB converts %p to %p', (input, expected) => {
    expect(bigIntegerField.toDB(input)).toBe(expected);
  });

  test.each(['900260056-1', '12.3', '123abc', '', '   ', Infinity, true, false, [], {}])(
    'BigIntegerField.toDB rejects invalid input %p',
    (input) => {
      expect(() => bigIntegerField.toDB(input)).toThrow(/Expected a valid BigInteger/);
    }
  );

  test.each([
    ['123', '123'],
    ['  +123  ', '123'],
    [123, '123'],
    [123n, '123'],
    [null, null],
    [undefined, undefined],
  ])('BigIntegerField.fromDB converts canonical values %p to %p', (input, expected) => {
    expect(bigIntegerField.fromDB(input)).toBe(expected);
  });

  test.each([
    ['900260056-1', '900260056-1'],
    ['12.3', '12.3'],
    ['abc', 'abc'],
  ])('BigIntegerField.fromDB keeps legacy malformed values readable: %p', (input, expected) => {
    expect(bigIntegerField.fromDB(input)).toBe(expected);
  });
});
