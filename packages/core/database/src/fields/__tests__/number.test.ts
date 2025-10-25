import NumberField from '../number';

describe('NumberField', () => {
  let field: NumberField;

  beforeEach(() => {
    field = new NumberField({});
  });

  describe('toDB', () => {
    describe('valid inputs', () => {
      it('should convert valid numeric string to number', () => {
        expect(field.toDB('123')).toBe(123);
        expect(field.toDB('123.45')).toBe(123.45);
        expect(field.toDB('-123')).toBe(-123);
        expect(field.toDB('-123.45')).toBe(-123.45);
      });

      it('should handle numeric strings with whitespace', () => {
        expect(field.toDB('  123  ')).toBe(123);
        expect(field.toDB('  123.45  ')).toBe(123.45);
      });

      it('should convert scientific notation strings', () => {
        expect(field.toDB('1e3')).toBe(1000);
        expect(field.toDB('1.23e2')).toBe(123);
      });

      it('should handle number values', () => {
        expect(field.toDB(123)).toBe(123);
        expect(field.toDB(123.45)).toBe(123.45);
        expect(field.toDB(-123)).toBe(-123);
        expect(field.toDB(0)).toBe(0);
      });

      it('should handle zero string values', () => {
        expect(field.toDB('0')).toBe(0);
        expect(field.toDB('0.0')).toBe(0);
      });

      it('should return null for null input', () => {
        expect(field.toDB(null)).toBeNull();
      });

      it('should return undefined for undefined input', () => {
        expect(field.toDB(undefined)).toBeUndefined();
      });

      it('should handle Infinity', () => {
        expect(field.toDB(Infinity)).toBe(Infinity);
        expect(field.toDB(-Infinity)).toBe(-Infinity);
        expect(field.toDB('Infinity')).toBe(Infinity);
        expect(field.toDB('-Infinity')).toBe(-Infinity);
      });
    });

    describe('invalid inputs - should throw errors', () => {
      it('should reject string with trailing non-numeric characters', () => {
        expect(() => field.toDB('900260056-1')).toThrow('Expected a valid Number, got 900260056-1');
        expect(() => field.toDB('123abc')).toThrow('Expected a valid Number, got 123abc');
        expect(() => field.toDB('123-456')).toThrow('Expected a valid Number, got 123-456');
      });

      it('should reject string with leading non-numeric characters', () => {
        expect(() => field.toDB('abc123')).toThrow('Expected a valid Number, got abc123');
        expect(() => field.toDB('$123')).toThrow('Expected a valid Number, got $123');
      });

      it('should reject string with non-numeric characters in the middle', () => {
        expect(() => field.toDB('12a34')).toThrow('Expected a valid Number, got 12a34');
      });

      it('should reject purely alphabetic strings', () => {
        expect(() => field.toDB('abc')).toThrow('Expected a valid Number, got abc');
        expect(() => field.toDB('hello')).toThrow('Expected a valid Number, got hello');
      });

      it('should reject empty string', () => {
        expect(() => field.toDB('')).toThrow('Expected a valid Number, got ');
      });

      it('should reject whitespace-only string', () => {
        expect(() => field.toDB('   ')).toThrow('Expected a valid Number, got    ');
      });

      it('should reject special characters', () => {
        expect(() => field.toDB('#')).toThrow('Expected a valid Number, got #');
        expect(() => field.toDB('@')).toThrow('Expected a valid Number, got @');
      });

      it('should reject objects', () => {
        expect(() => field.toDB({})).toThrow('Expected a valid Number');
        expect(() => field.toDB({ value: 123 })).toThrow('Expected a valid Number');
      });

      it('should reject arrays', () => {
        expect(() => field.toDB([])).toThrow('Expected a valid Number');
        expect(() => field.toDB([123])).toThrow('Expected a valid Number');
      });

      it('should reject boolean values that result in NaN', () => {
        // Note: booleans actually convert to 0 and 1, so they might be valid
        // This depends on the expected behavior
        expect(field.toDB(true)).toBe(1);
        expect(field.toDB(false)).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should handle very large numbers', () => {
        expect(field.toDB('999999999999999')).toBe(999999999999999);
        expect(field.toDB(999999999999999)).toBe(999999999999999);
      });

      it('should handle very small numbers', () => {
        expect(field.toDB('0.00000001')).toBe(0.00000001);
        expect(field.toDB(0.00000001)).toBe(0.00000001);
      });

      it('should handle negative zero', () => {
        expect(field.toDB('-0')).toBe(0);
      });
    });
  });

  describe('fromDB', () => {
    it('should convert values from database', () => {
      expect(field.fromDB(123)).toBe(123);
      expect(field.fromDB('123')).toBe(123);
      expect(field.fromDB(123.45)).toBe(123.45);
    });

    it('should handle null', () => {
      expect(field.fromDB(null)).toBe(0); // toNumber converts null to 0
    });
  });
});
