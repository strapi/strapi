import { createHash } from '../hash';

import { Identifiers } from '../index';

describe('identifiers', () => {
  const identifiers = new Identifiers({ maxLength: 55 });

  // ensure nobody changes these by accident
  // NOTE: if these contants ever change between versions, it will cause massive data loss
  describe('constants', () => {
    test('HASH_LENGTH === 5', () => {
      expect(identifiers.HASH_LENGTH).toBe(5);
    });
    test('HASH_SEPARATOR === empty string', () => {
      expect(identifiers.HASH_SEPARATOR).toBe('');
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

  describe('getShortenedName', () => {
    test('does not add hash when len == input length', () => {
      const res = identifiers.getShortenedName('1234567890', 10);
      expect(res).toEqual('1234567890');
    });
    test('returns original string when len > input length', () => {
      const res = identifiers.getShortenedName('1234567890', 100);
      expect(res).toEqual('1234567890');
    });
    test('throws when len < HASH_LENGTH + MIN_TOKEN_LENGTH', () => {
      expect(() =>
        identifiers.getShortenedName(
          '1234567890',
          identifiers.HASH_LENGTH + identifiers.MIN_TOKEN_LENGTH - 1
        )
      ).toThrow(
        'length for part of identifier too short, minimum is hash length (5) plus min token length (3), received 7'
      );
    });
    test('adds hash when len < input length (with correct length)', () => {
      const len = 9;
      const res = identifiers.getShortenedName('1234567890', len);
      expect(res).toEqual('1234cd65a');
      expect(res.length).toBe(len);
    });
    test('adds hash when len == HASH_LENGTH + MIN_TOKEN_LENGTH', () => {
      const res = identifiers.getShortenedName('1234567890', 9);
      expect(res).toEqual('1234cd65a');
    });
    test('throws when len === 0', () => {
      expect(() => identifiers.getShortenedName('1234567890', 0)).toThrow(
        'length must be a positive integer'
      );
    });
    test('throws when len < 0', () => {
      expect(() => identifiers.getShortenedName('1234567890', -3)).toThrow(
        'length must be a positive integer'
      );
    });
    test('throws when len invalid data type', () => {
      // @ts-expect-error test bad input type
      expect(() => identifiers.getShortenedName('1234567890', '10')).toThrow(
        'length must be a positive integer'
      );
    });
  });
  describe('getNameFromTokens', () => {
    test('does not shorten strings that fit in min length', () => {
      const id = new Identifiers({ maxLength: 22 });
      const name = id.getNameFromTokens([
        { name: '1234567890', compressible: true },
        { name: '12345', compressible: true },
        { name: 'links', compressible: false },
      ]);
      expect(name).toEqual('1234567890_12345_links');
    });

    test('supports strings with separator in them already', () => {
      const id = new Identifiers({ maxLength: 22 });
      const name = id.getNameFromTokens([
        { name: '1234_56789', compressible: true },
        { name: '123_4', compressible: true },
        { name: 'links', compressible: false },
      ]);
      expect(name).toEqual('1234_56789_123_4_links');
    });

    test('shortens string that does not fit in min length (one compressible)', () => {
      const id = new Identifiers({ maxLength: 13 });
      const name = id.getNameFromTokens([{ name: '123456789012345', compressible: true }]);
      expect(name).toEqual('1234567878db8');
    });

    test('shortens strings with separator in them already (last char before hash)', () => {
      const id = new Identifiers({ maxLength: 13 });
      const name = id.getNameFromTokens([{ name: '1234567_9012345', compressible: true }]);
      expect(name).toEqual('1234567_47b4e');
    });

    test('shortens strings with separator in them already (past the hash)', () => {
      const id = new Identifiers({ maxLength: 13 });
      const name = id.getNameFromTokens([{ name: '12345678_012345', compressible: true }]);
      expect(name).toEqual('12345678867f6');
    });

    test('returns original string when it fits (one compressible)', () => {
      const id5 = new Identifiers({ maxLength: 5 });
      const name = id5.getNameFromTokens([{ name: '12345', compressible: true }]);
      expect(name).toEqual('12345');

      const id10 = new Identifiers({ maxLength: 10 });
      const name2 = id10.getNameFromTokens([{ name: '12345', compressible: true }]);
      expect(name2).toEqual('12345');
    });

    test('shortens long string that do not fit in min length (two compressible one of which short, one suffix)', () => {
      const id = new Identifiers({ maxLength: 21 });
      const name = id.getNameFromTokens([
        { name: '1234567890', compressible: true },
        { name: '12345', compressible: true },
        { name: 'links', compressible: false },
      ]);
      expect(name).toEqual('1234cd65a_12345_links');
    });

    test('uses shortname when available for incompressible links', () => {
      const id = new Identifiers({ maxLength: 21 });
      const name = id.getNameFromTokens([
        { name: '1234567890', compressible: true },
        { name: '12345', compressible: true },
        { name: 'links', compressible: false, shortName: 'lnk' },
      ]);
      expect(name).toEqual('1234567890_12345_lnk');
    });

    test('throws when cannot compress without violating min length rules', () => {
      const id = new Identifiers({ maxLength: 21 });
      expect(() =>
        id.getNameFromTokens([
          { name: '1234567890', compressible: true },
          { name: '1234567890', compressible: true },
          { name: 'links', compressible: false },
        ])
      ).toThrow('Maximum length is too small to accommodate all tokens');
    });

    test('shortens two long strings when maxLength is the shortest possible', () => {
      const separatorsNeeded = 2;
      const incompressibleString = 'links';
      const compressibleStrings = 2;
      const len =
        (identifiers.MIN_TOKEN_LENGTH + identifiers.HASH_LENGTH) * compressibleStrings +
        incompressibleString.length +
        identifiers.IDENTIFIER_SEPARATOR.length * separatorsNeeded;
      expect(len).toBe(23);

      const id = new Identifiers({ maxLength: len });

      const name = id.getNameFromTokens([
        { name: '1234567890', compressible: true },
        { name: '1234567890', compressible: true },
        { name: incompressibleString, compressible: false },
      ]);
      expect(name).toEqual('123cd65a_123cd65a_links');
    });

    test('works with max capacity', () => {
      const id = new Identifiers({ maxLength: 12 });
      const res = id.getNameFromTokens([
        { name: '12', compressible: true },
        { name: '12', compressible: true },
        { name: '12', compressible: true },
        { name: '12', compressible: true },
      ]);
      expect(res).toBe('12_12_12_12');
    });

    test('throws when compressible strings cannot fit', () => {
      const id = new Identifiers({ maxLength: 12 });
      expect(() =>
        id.getNameFromTokens([
          { name: '12', compressible: true },
          { name: '12', compressible: true },
          { name: '12', compressible: true },
          { name: '1', compressible: true },
          { name: '12', compressible: true },
        ])
      ).toThrow('Maximum length is too small to accommodate all tokens');
    });

    test('throws when incompressible string cannot fit', () => {
      const id = new Identifiers({ maxLength: 5 });
      expect(() => id.getNameFromTokens([{ name: '123456', compressible: false }])).toThrow(
        'Maximum length is too small to accommodate all tokens'
      );
    });

    test('throws when incompressible strings cannot fit due to separators', () => {
      const id = new Identifiers({ maxLength: 12 });
      expect(() =>
        id.getNameFromTokens([
          { name: '123456', compressible: false },
          { name: '123456', compressible: false },
        ])
      ).toThrow('Maximum length is too small to accommodate all tokens');
    });

    test('shortens strings that result in exactly maxLength (three compressible, suffix)', () => {
      const id = new Identifiers({ maxLength: 30 });
      const name = id.getNameFromTokens([
        { name: '1234567890', compressible: true },
        { name: '12345', compressible: true },
        { name: '0987654321', compressible: true },
        { name: 'links', compressible: false },
      ]);
      expect(name.length).toEqual(30);
      expect(name).toEqual('1234cd65a_12345_0984addb_links');
    });

    test('shortens strings that do not fit in min length (three compressible, prefix)', () => {
      const id = new Identifiers({ maxLength: 34 });
      const name = id.getNameFromTokens([
        { name: 'inv_order', compressible: false },
        { name: '1234567890', compressible: true },
        { name: '12345', compressible: true },
        { name: '0987654321', compressible: true },
      ]);
      expect(name.length).toEqual(34);
      expect(name).toEqual('inv_order_1234cd65a_12345_0984addb');
    });
    test('shortens strings that do not fit in min length (three compressible, suffix, prefix, and infix)', () => {
      const id = new Identifiers({ maxLength: 31 });
      const name = id.getNameFromTokens([
        { name: 'pre', compressible: false },
        { name: '1234567890', compressible: true },
        { name: 'in', compressible: false },
        { name: '3456789012', compressible: true },
        { name: 'post', compressible: false },
      ]);
      expect(name.length).toEqual(31);
      expect(name).toEqual('pre_1234cd65a_in_3456be378_post');
    });
    test('redistributes perfectly to max length even with same length long strings where one must be shortened (three compressible, suffix, prefix, and infix)', () => {
      const id = new Identifiers({ maxLength: 32 });
      const name = id.getNameFromTokens([
        { name: 'pre', compressible: false },
        { name: '1234567890', compressible: true },
        { name: 'in', compressible: false },
        { name: '3456789012', compressible: true },
        { name: 'post', compressible: false },
      ]);
      expect(name.length).toEqual(32);
      expect(name).toEqual('pre_1234567890_in_3456be378_post');
    });
    test('works for max length incompressibles', () => {
      const id = new Identifiers({ maxLength: 34 });
      const name = id.getNameFromTokens([
        { name: '1234567890', compressible: false },
        { name: '2345678901', compressible: false },
        { name: '3456789012', compressible: false },
      ]);
      expect(name).toEqual('1234567890_2345678901_3456789012');
    });
  });
  describe('full name mapping', () => {
    test('dsfgsdfg', () => {
      const id = new Identifiers({ maxLength: 21 });

      const name = id.getNameFromTokens([
        { name: '1234567890', compressible: true },
        { name: '12345', compressible: true },
        { name: 'links', compressible: false, shortName: 'lnk' },
      ]);
      expect(name).toEqual('1234567890_12345_lnk');
      const unshortenedName = id.getUnshortenedName(name);
      expect(unshortenedName).toEqual('1234567890_12345_links');
    });
  });
});
