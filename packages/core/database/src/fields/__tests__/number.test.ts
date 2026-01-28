import NumberField from '../number';

describe('NumberField', () => {
  let field: NumberField;

  beforeEach(() => {
    field = new NumberField({});
  });

  describe('toDB', () => {
    // Test data to reduce duplication
    const validInputs = [
      { input: 123, expected: 123, description: 'integer number' },
      { input: 123.45, expected: 123.45, description: 'float number' },
      { input: -123, expected: -123, description: 'negative number' },
      { input: 0, expected: 0, description: 'zero' },
      { input: '123', expected: 123, description: 'numeric string' },
      { input: '123.45', expected: 123.45, description: 'decimal string' },
      { input: '-123', expected: -123, description: 'negative string' },
      { input: '  123  ', expected: 123, description: 'string with whitespace' },
      { input: '0', expected: 0, description: 'zero string' },
      { input: '1e3', expected: 1000, description: 'scientific notation' },
      { input: Infinity, expected: Infinity, description: 'Infinity' },
      { input: -Infinity, expected: -Infinity, description: '-Infinity' },
      { input: 'Infinity', expected: Infinity, description: 'Infinity string' },
      { input: true, expected: 1, description: 'boolean true' },
      { input: false, expected: 0, description: 'boolean false' },
    ];

    const invalidInputs = [
      { input: '900260056-1', description: 'bug #24678 - string with trailing dash' },
      { input: '123abc', description: 'alphanumeric with trailing letters' },
      { input: '123-456', description: 'string with dash in middle' },
      { input: 'abc123', description: 'string with leading letters' },
      { input: '$123', description: 'currency format' },
      { input: '12a34', description: 'letters in middle' },
      { input: 'abc', description: 'pure alphabetic string' },
      { input: 'hello', description: 'text string' },
      { input: '', description: 'empty string' },
      { input: '   ', description: 'whitespace-only string' },
      { input: '#', description: 'special character #' },
      { input: '@', description: 'special character @' },
      { input: {}, description: 'empty object' },
      { input: { value: 123 }, description: 'object with properties' },
      { input: [], description: 'empty array' },
      { input: [123], description: 'array with value' },
    ];

    const nullishValues = [
      { input: null, expected: null, description: 'null' },
      { input: undefined, expected: undefined, description: 'undefined' },
    ];

    describe('valid inputs', () => {
      validInputs.forEach(({ input, expected, description }) => {
        it(`should handle ${description}`, () => {
          expect(field.toDB(input)).toBe(expected);
        });
      });

      nullishValues.forEach(({ input, expected, description }) => {
        it(`should return ${description} as-is`, () => {
          expect(field.toDB(input)).toBe(expected);
        });
      });
    });

    describe('invalid inputs - should throw errors', () => {
      invalidInputs.forEach(({ input, description }) => {
        it(`should reject ${description}`, () => {
          expect(() => field.toDB(input)).toThrow(/Expected a valid Number/);
        });
      });
    });

    describe('edge cases', () => {
      const edgeCases = [
        { input: '999999999999999', expected: 999999999999999, description: 'very large string' },
        { input: 999999999999999, expected: 999999999999999, description: 'very large number' },
        { input: '0.00000001', expected: 0.00000001, description: 'very small string' },
        { input: 0.00000001, expected: 0.00000001, description: 'very small number' },
        { input: '-0', expected: 0, description: 'negative zero string' },
      ];

      edgeCases.forEach(({ input, expected, description }) => {
        it(`should handle ${description}`, () => {
          expect(field.toDB(input)).toBe(expected);
        });
      });
    });
  });

  describe('fromDB', () => {
    const fromDBCases = [
      { input: 123, expected: 123 },
      { input: '123', expected: 123 },
      { input: 123.45, expected: 123.45 },
      { input: null, expected: 0 }, // toNumber converts null to 0
    ];

    fromDBCases.forEach(({ input, expected }) => {
      it(`should convert ${JSON.stringify(input)} from database`, () => {
        expect(field.fromDB(input)).toBe(expected);
      });
    });
  });
});
