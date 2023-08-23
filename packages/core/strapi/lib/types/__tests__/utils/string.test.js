'use strict';

const path = require('path');
const { fromFile, t } = require('ts-zen');

const STRING_UTILS_DTS_PATH = path.join(__dirname, '..', 'definitions', 'utils', 'string.d.ts');

/**
 * @type {import('ts-zen').AssertTypeSelector}
 */
let assertType;

describe('Utils.String', () => {
  beforeAll(() => {
    assertType = fromFile(STRING_UTILS_DTS_PATH, {
      compilerOptions: { strict: true },
      ignoreProjectOptions: true,
    });
  });

  test('Dict', () => {
    // TODO: Replace with isMappedType matcher when available
    assertType('NumberDict').equals('{ [x: string]: number; }');
    assertType('StringDict').equals('{ [x: string]: string; }');
    assertType('BooleanDict').equals('{ [x: string]: boolean; }');
  });

  test('EndsWith', () => {
    assertType('EndsWithCorrectNumber').isBooleanLiteral(true);
    assertType('EndsWithIncorrectNumber').isBooleanLiteral(false);
    assertType('EndsWithCorrectString').isBooleanLiteral(true);
    assertType('EndsWithIncorrectString').isBooleanLiteral(false);
  });

  test('StartsWith', () => {
    assertType('StartsWithCorrectNumber').isBooleanLiteral(true);
    assertType('StartsWithIncorrectNumber').isBooleanLiteral(false);
    assertType('StartsWithCorrectString').isBooleanLiteral(true);
    assertType('StartsWithIncorrectString').isBooleanLiteral(false);
  });

  test('Includes', () => {
    const template = (str) => [t.string(), String(str), t.string()];

    assertType('IncludesNumber').isTemplateLiteral(template(42));
    assertType('IncludesString').isTemplateLiteral(template('foo'));
    assertType('IncludesBoolean').isUnion([
      t.templateLiteral(template(true)),
      t.templateLiteral(template(false)),
    ]);
    assertType('IncludesBooleanLiteral').isTemplateLiteral(template(true));
  });

  test('NonEmpty', () => {
    assertType('NonEmptyOnEmptyString').isNever();
    assertType('NonEmptyOnNonEmptyString').isStringLiteral('Hello World');
  });

  test('Prefix', () => {
    assertType('PrefixEmptyString').isStringLiteral('Hello');
    assertType('PrefixString').isTemplateLiteral(['Hello ', t.string()]);
    assertType('PrefixLiteralString').isStringLiteral('Hello World');
    assertType('PrefixLiteralStringUnion').isUnion([
      t.stringLiteral('Hello World'),
      t.stringLiteral('Hello Everyone'),
    ]);
    assertType('PrefixLiteralStringWithUnion').isUnion([
      t.stringLiteral('Hello World'),
      t.stringLiteral('Bonjour World'),
      t.stringLiteral('Hola World'),
    ]);
  });

  test('Suffix', () => {
    assertType('SuffixEmptyString').isStringLiteral('Hello');
    assertType('SuffixString').isTemplateLiteral([t.string(), '.']);
    assertType('SuffixLiteralString').isStringLiteral('Hello World');
    assertType('SuffixLiteralStringUnion').isUnion([
      t.stringLiteral('Hello World'),
      t.stringLiteral('Bonjour World'),
      t.stringLiteral('Hola World'),
    ]);
    assertType('SuffixLiteralStringWithUnion').isUnion([
      t.stringLiteral('Hello World'),
      t.stringLiteral('Hello Everyone'),
    ]);
  });

  test('Literal', () => {
    assertType('Literal').isUnion([t.string(), t.number(), t.bigInt(), t.booleanLiteral()]);
  });

  test('Split', () => {
    assertType('SplitEmptyStringBySpace').isTuple([]);
    assertType('SplitEmptyStringByEmptyString').isTuple([]);
    assertType('SplitEmptyStringByString').isTuple([]);
    assertType('SplitBySpace').isTuple(
      ['Hello', 'World,', 'How', 'are', 'you?'].map(t.stringLiteral)
    );
    assertType('SplitByEmptyString').isTuple(['H', 'e', 'l', 'l', 'o'].map(t.stringLiteral));
    // This will use any string character as a delimiter, thus removing 1/2 characters
    assertType('SplitByString').isTuple(['H', 'l', 'o'].map(t.stringLiteral));
  });
});
