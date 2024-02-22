import {
  HASH_LENGTH,
  HASH_SEPARATOR,
  IDENTIFIER_SEPARATOR,
  MIN_TOKEN_LENGTH,
  createHash,
  getNameFromTokens,
  tokenWithHash,
} from '..';

describe('identifiers', () => {
  describe('constants', () => {
    test('HASH_LENGTH === 5', () => {
      expect(HASH_LENGTH).toBe(5);
    });
    test('HASH_SEPARATOR === empty string', () => {
      expect(HASH_SEPARATOR).toBe('');
    });
  });

  describe('createHash', () => {
    test('works with even number length', () => {
      const res = createHash('123456789', 2);
      expect(res.length).toBe(2);
      expect(res).toEqual('24');

      const res2 = createHash('123456789', 4);
      expect(res2.length).toBe(4);
      expect(res2).toEqual('2434');
    });
    test('works with odd number length', () => {
      const res = createHash('123456789', 3);
      expect(res.length).toBe(3);
      expect(res).toEqual('243');
    });
    test('works with length longer than input', () => {
      const res = createHash('123456789', 50);
      expect(res.length).toBe(50);
      expect(res).toEqual('24347b9c4b6da2fc9cde08c87f33edd2e603c8dcd6840e6b39');
    });
    test('throws with len === 0', () => {
      expect(() => createHash('123456789', 0)).toThrow('length must be a positive integer');
    });
    test('throws when len < 0', () => {
      expect(() => createHash('123456789', -3)).toThrow('length must be a positive integer');
    });
    test('throws when len invalid data type', () => {
      // @ts-expect-error test bad input type
      expect(() => createHash('123456789', '10')).toThrow('length must be a positive integer');
    });
  });

  describe('tokenWithHash', () => {
    test('does not add hash when len == input length', () => {
      const res = tokenWithHash('1234567890', 10);
      expect(res).toEqual('1234567890');
    });
    test('returns original string when len > input length', () => {
      const res = tokenWithHash('1234567890', 100);
      expect(res).toEqual('1234567890');
    });
    test('throws when len < HASH_LENGTH + MIN_TOKEN_LENGTH', () => {
      expect(() => tokenWithHash('1234567890', HASH_LENGTH + MIN_TOKEN_LENGTH - 1)).toThrow(
        'length for part of identifier too short, minimum is hash length (5) plus min token length (3), received 7'
      );
    });
    test('adds hash when len < input length (with correct length)', () => {
      const len = 9;
      const res = tokenWithHash('1234567890', len);
      expect(res).toEqual('1234cd65a');
      expect(res.length).toBe(len);
    });
    test('adds hash when len == HASH_LENGTH + MIN_TOKEN_LENGTH', () => {
      const res = tokenWithHash('1234567890', 9);
      expect(res).toEqual('1234cd65a');
    });
    test('throws when len === 0', () => {
      expect(() => tokenWithHash('1234567890', 0)).toThrow('length must be a positive integer');
    });
    test('throws when len < 0', () => {
      expect(() => tokenWithHash('1234567890', -3)).toThrow('length must be a positive integer');
    });
    test('throws when len invalid data type', () => {
      // @ts-expect-error test bad input type
      expect(() => tokenWithHash('1234567890', '10')).toThrow('length must be a positive integer');
    });
  });
  describe('getNameFromTokens', () => {
    test('throws when a name is not in snake_case', () => {
      expect(() =>
        getNameFromTokens(
          [
            { name: 'myName', compressible: true },
            { name: '12345', compressible: true },
            { name: 'links', compressible: false },
          ],
          23
        )
      ).toThrow('snake_case');
    });

    test('does not shorten strings that fit in min length', () => {
      const name = getNameFromTokens(
        [
          { name: '1234567890', compressible: true },
          { name: '12345', compressible: true },
          { name: 'links', compressible: false },
        ],
        22
      );
      expect(name).toEqual('1234567890_12345_links');
    });

    test('shortens string that does not fit in min length (one compressible)', () => {
      const name = getNameFromTokens([{ name: '123456789012345', compressible: true }], 13);
      expect(name).toEqual('1234567878db8');
    });

    test('returns original string when it fits (one compressible)', () => {
      const name = getNameFromTokens([{ name: '12345', compressible: true }], 5);
      expect(name).toEqual('12345');

      const name2 = getNameFromTokens([{ name: '12345', compressible: true }], 10);
      expect(name2).toEqual('12345');
    });

    test('shortens long string that do not fit in min length (two compressible one of which short, one suffix)', () => {
      const name = getNameFromTokens(
        [
          { name: '1234567890', compressible: true },
          { name: '12345', compressible: true },
          { name: 'links', compressible: false },
        ],
        21
      );
      expect(name).toEqual('1234cd65a_12345_links');
    });

    test('throws when cannot compress without violating min length rules', () => {
      expect(() =>
        getNameFromTokens(
          [
            { name: '1234567890', compressible: true },
            { name: '1234567890', compressible: true },
            { name: 'links', compressible: false },
          ],
          21
        )
      ).toThrow(
        'Maximum length is too small to accommodate all tokens'
        // This means that it's trying to call createHash('1234567890', 7) because: 21 - 5 (links length) - 2 (separators length) = 14, 14/2 = 7
        // 'length for part of identifier too short, minimum is hash length (5) plus min token length (3), received 7 for token 1234567890'
      );
    });

    test('shortens two long strings when maxLength is the shortest possible', () => {
      const len = (MIN_TOKEN_LENGTH + HASH_LENGTH) * 2 + 5 + IDENTIFIER_SEPARATOR.length * 2;
      expect(len).toBe(23);

      const name = getNameFromTokens(
        [
          { name: '1234567890', compressible: true },
          { name: '1234567890', compressible: true },
          { name: 'links', compressible: false },
        ],
        len
      );
      expect(name).toEqual('123cd65a_123cd65a_links');
    });

    test('works with max capacity', () => {
      const res = getNameFromTokens(
        [
          { name: '12', compressible: true },
          { name: '12', compressible: true },
          { name: '12', compressible: true },
          { name: '12', compressible: true },
        ],
        12
      );
      expect(res).toBe('12_12_12_12');
    });

    test('throws when compressible strings cannot fit', () => {
      expect(() =>
        getNameFromTokens(
          [
            { name: '12', compressible: true },
            { name: '12', compressible: true },
            { name: '12', compressible: true },
            { name: '1', compressible: true },
            { name: '12', compressible: true },
          ],
          12
        )
      ).toThrow('Maximum length is too small to accommodate all tokens');
    });

    test('throws when incompressible string cannot fit', () => {
      expect(() => getNameFromTokens([{ name: '123456', compressible: false }], 5)).toThrow(
        'incompressible string length greater than maxLength'
      );
    });

    test('throws when incompressible strings cannot fit due to separators', () => {
      expect(() =>
        getNameFromTokens(
          [
            { name: '123456', compressible: false },
            { name: '123456', compressible: false },
          ],
          12
        )
      ).toThrow('incompressible string length greater than maxLength');
    });

    test('shortens strings that result in exactly maxLength (three compressible, suffix)', () => {
      const name = getNameFromTokens(
        [
          { name: '1234567890', compressible: true },
          { name: '12345', compressible: true },
          { name: '0987654321', compressible: true },
          { name: 'links', compressible: false },
        ],
        30
      );
      expect(name.length).toEqual(30);
      expect(name).toEqual('1234cd65a_12345_0984addb_links');
    });
  });
  test('shortens strings that do not fit in min length (three compressible, prefix)', () => {
    const name = getNameFromTokens(
      [
        { name: 'inv_order', compressible: false },
        { name: '1234567890', compressible: true },
        { name: '12345', compressible: true },
        { name: '0987654321', compressible: true },
      ],
      34
    );
    expect(name.length).toEqual(34);
    expect(name).toEqual('inv_order_1234cd65a_12345_0984addb');
  });
  test('shortens strings that do not fit in min length (three compressible, suffix, prefix, and infix)', () => {
    const name = getNameFromTokens(
      [
        { name: 'pre', compressible: false },
        { name: '1234567890', compressible: true },
        { name: 'in', compressible: false },
        { name: '3456789012', compressible: true },
        { name: 'post', compressible: false },
      ],
      31
    );
    expect(name.length).toEqual(31);
    expect(name).toEqual('pre_1234cd65a_in_3456be378_post');
  });
  test('redistributes perfectly to max length even with same length long strings where one must be shortened (three compressible, suffix, prefix, and infix)', () => {
    const name = getNameFromTokens(
      [
        { name: 'pre', compressible: false },
        { name: '1234567890', compressible: true },
        { name: 'in', compressible: false },
        { name: '3456789012', compressible: true },
        { name: 'post', compressible: false },
      ],
      32
    );
    expect(name.length).toEqual(32);
    expect(name).toEqual('pre_1234567890_in_3456be378_post');
  });
  test('works for max length incompressibles', () => {
    const name = getNameFromTokens(
      [
        { name: '1234567890', compressible: false },
        { name: '2345678901', compressible: false },
        { name: '3456789012', compressible: false },
      ],
      34
    );
    expect(name).toEqual('1234567890_2345678901_3456789012');
  });
});
