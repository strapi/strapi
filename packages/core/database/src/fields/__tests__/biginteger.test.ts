import BigIntegerField from '../biginteger';
import type { Attribute } from '../../types';

describe('BigIntegerField', () => {
  describe('Internal columns (IDs and FK columns)', () => {
    describe('type: increments (ID column)', () => {
      let field: BigIntegerField;

      beforeEach(() => {
        field = new BigIntegerField({ type: 'increments' } as Attribute);
      });

      it('should convert string to number', () => {
        expect(field.fromDB('123')).toBe(123);
        expect(field.fromDB('0')).toBe(0);
        expect(field.fromDB('1')).toBe(1);
      });

      it('should convert negative strings to numbers', () => {
        expect(field.fromDB('-123')).toBe(-123);
      });

      it('should handle large numbers within MAX_SAFE_INTEGER', () => {
        const maxSafeInteger = Number.MAX_SAFE_INTEGER;
        expect(field.fromDB(String(maxSafeInteger))).toBe(maxSafeInteger);
        expect(field.fromDB(String(maxSafeInteger - 1))).toBe(maxSafeInteger - 1);
      });

      it('should handle values that are already numbers', () => {
        expect(field.fromDB(123)).toBe(123);
        expect(field.fromDB(0)).toBe(0);
        expect(field.fromDB(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
      });

      it('should throw error when value exceeds MAX_SAFE_INTEGER (as string)', () => {
        const overflowValue = String(Number.MAX_SAFE_INTEGER + 1);
        expect(() => field.fromDB(overflowValue)).toThrow(/exceeds JavaScript's MAX_SAFE_INTEGER/);
      });

      it('should throw error when value exceeds MAX_SAFE_INTEGER (as number)', () => {
        const overflowValue = Number.MAX_SAFE_INTEGER + 1;
        expect(() => field.fromDB(overflowValue)).toThrow(/exceeds JavaScript's MAX_SAFE_INTEGER/);
      });

      it('should throw error for invalid string values', () => {
        expect(() => field.fromDB('not-a-number')).toThrow(/Cannot convert value/);
        expect(() => field.fromDB('abc')).toThrow(/Cannot convert value/);
      });

      it('should handle typical ID values', () => {
        expect(field.fromDB('1')).toBe(1);
        expect(field.fromDB('1000')).toBe(1000);
        expect(field.fromDB('999999')).toBe(999999);
        expect(field.fromDB('1000000000')).toBe(1000000000);
      });
    });

    describe('type: bigincrements (ID column after migration)', () => {
      let field: BigIntegerField;

      beforeEach(() => {
        field = new BigIntegerField({ type: 'bigincrements' } as Attribute);
      });

      it('should convert string to number', () => {
        expect(field.fromDB('123')).toBe(123);
        expect(field.fromDB('0')).toBe(0);
        expect(field.fromDB('1')).toBe(1);
      });

      it('should throw error when value exceeds MAX_SAFE_INTEGER', () => {
        const overflowValue = String(Number.MAX_SAFE_INTEGER + 1);
        expect(() => field.fromDB(overflowValue)).toThrow(/exceeds JavaScript's MAX_SAFE_INTEGER/);
      });
    });

    describe('type: biginteger with internalIntegerId: true (FK column)', () => {
      let field: BigIntegerField;

      beforeEach(() => {
        field = new BigIntegerField({
          type: 'biginteger',
          internalIntegerId: true,
        } as Attribute);
      });

      it('should convert string to number for internal FK columns', () => {
        expect(field.fromDB('123')).toBe(123);
        expect(field.fromDB('0')).toBe(0);
        expect(field.fromDB('456')).toBe(456);
      });

      it('should throw error when FK value exceeds MAX_SAFE_INTEGER', () => {
        const overflowValue = String(Number.MAX_SAFE_INTEGER + 1);
        expect(() => field.fromDB(overflowValue)).toThrow(/exceeds JavaScript's MAX_SAFE_INTEGER/);
      });
    });
  });

  describe('User-defined biginteger attributes', () => {
    let field: BigIntegerField;

    beforeEach(() => {
      // User-defined biginteger: no __internal__ flag
      field = new BigIntegerField({ type: 'biginteger' } as Attribute);
    });

    it('should return string for user-defined biginteger (backwards compatible)', () => {
      expect(field.fromDB('123')).toBe('123');
      expect(field.fromDB('0')).toBe('0');
      expect(field.fromDB('1')).toBe('1');
    });

    it('should preserve string representation of large numbers', () => {
      // Values beyond MAX_SAFE_INTEGER should be preserved as strings
      const hugeBigInt = '9007199254740992'; // MAX_SAFE_INTEGER + 1
      expect(field.fromDB(hugeBigInt)).toBe(hugeBigInt);

      const veryLarge = '99999999999999999999';
      expect(field.fromDB(veryLarge)).toBe(veryLarge);
    });

    it('should convert number to string', () => {
      expect(field.fromDB(123)).toBe('123');
      expect(field.fromDB(0)).toBe('0');
    });

    it('should handle negative values', () => {
      expect(field.fromDB('-123')).toBe('-123');
      expect(field.fromDB(-456)).toBe('-456');
    });
  });

  describe('toDB', () => {
    it('should convert values to strings for both internal and user-defined', () => {
      const internalField = new BigIntegerField({ type: 'increments' } as Attribute);
      const userField = new BigIntegerField({ type: 'biginteger' } as Attribute);

      expect(internalField.toDB(123)).toBe('123');
      expect(internalField.toDB(0)).toBe('0');
      expect(userField.toDB(123)).toBe('123');
      expect(userField.toDB(0)).toBe('0');
    });
  });
});
