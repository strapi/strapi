import { createHash, getNameFromTokens, tokenWithHash } from '..';

describe('identifiers', () => {
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
    test('only shortens when necessary', () => {
      const res = tokenWithHash('1234567890', 10);
      expect(res).toEqual('1234567890');
    });
    test('shortens to correct length', () => {
      const res = tokenWithHash('1234567890', 7);
      expect(res).toEqual('1234xcd');
    });
    test('works with edge case - min length', () => {
      const res = tokenWithHash('1234567890', 5);
      expect(res).toEqual('12xcd');
    });
    test('throws when len < (HASH_LENGTH + 1 (_) + 2 (min identifier length))', () => {
      expect(() => tokenWithHash('1234567890', 4)).toThrow('length too short');
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
        23
      );
      expect(name).toEqual('1234567890_12345_links');
    });
    test('shortens strings that do not fit in min length (two compressible)', () => {
      const name = getNameFromTokens(
        [
          { name: '1234567890', compressible: true },
          { name: '12345', compressible: true },
          { name: 'links', compressible: false },
        ],
        20
      );
      expect(name).toEqual('12345xcd_12345_links');
    });
    test('shortens strings that do not fit in min length (three compressible)', () => {
      const name = getNameFromTokens(
        [
          { name: '1234567890', compressible: true },
          { name: '12345', compressible: true },
          { name: '0987654321', compressible: true },
          { name: 'links', compressible: false },
        ],
        25
      );
      expect(name).toEqual('123xcd_12345_098x4a_links');
    });
  });
});
