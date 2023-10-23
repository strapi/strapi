import path from 'path';

import { AssertTypeSelector, t } from '@strapi/ts-zen';

import { createTypeSelector } from '../test.utils';
import type StringUtils from '../definitions/utils/string';

const DEFINITIONS_PATH = path.join('utils', 'string.d.ts');

let type: AssertTypeSelector<typeof StringUtils>;

describe('Utils.String', () => {
  beforeAll(() => {
    type = createTypeSelector(DEFINITIONS_PATH);
  });

  test('Dict', () => {
    type('NumberDict').isAnonymousObject({
      indexes: [{ keyType: t.string(), type: t.number() }],
    });

    type('StringDict').isAnonymousObject({
      indexes: [{ keyType: t.string(), type: t.string() }],
    });

    type('BooleanDict').isAnonymousObject({
      indexes: [{ keyType: t.string(), type: t.boolean() }],
    });
  });

  test('EndsWith', () => {
    type('EndsWithCorrectNumber').isBooleanLiteral(true);
    type('EndsWithIncorrectNumber').isBooleanLiteral(false);
    type('EndsWithCorrectString').isBooleanLiteral(true);
    type('EndsWithIncorrectString').isBooleanLiteral(false);
  });

  test('StartsWith', () => {
    type('StartsWithCorrectNumber').isBooleanLiteral(true);
    type('StartsWithIncorrectNumber').isBooleanLiteral(false);
    type('StartsWithCorrectString').isBooleanLiteral(true);
    type('StartsWithIncorrectString').isBooleanLiteral(false);
  });

  test('Includes', () => {
    const template = (str: string | number | boolean) => [t.string(), String(str), t.string()];

    type('IncludesNumber').isTemplateLiteral(template(42));
    type('IncludesString').isTemplateLiteral(template('foo'));
    type('IncludesBoolean').isUnion([
      t.templateLiteral(template(true)),
      t.templateLiteral(template(false)),
    ]);
    type('IncludesBooleanLiteral').isTemplateLiteral(template(true));
  });

  test('NonEmpty', () => {
    type('NonEmptyOnEmptyString').isNever();
    type('NonEmptyOnNonEmptyString').isStringLiteral('Hello World');
  });

  test('Prefix', () => {
    type('PrefixEmptyString').isStringLiteral('Hello');
    type('PrefixString').isTemplateLiteral(['Hello ', t.string()]);
    type('PrefixLiteralString').isStringLiteral('Hello World');
    type('PrefixLiteralStringUnion').isUnion([
      t.stringLiteral('Hello World'),
      t.stringLiteral('Hello Everyone'),
    ]);
    type('PrefixLiteralStringWithUnion').isUnion([
      t.stringLiteral('Hello World'),
      t.stringLiteral('Bonjour World'),
      t.stringLiteral('Hola World'),
    ]);
  });

  test('Suffix', () => {
    type('SuffixEmptyString').isStringLiteral('Hello');
    type('SuffixString').isTemplateLiteral([t.string(), '.']);
    type('SuffixLiteralString').isStringLiteral('Hello World');
    type('SuffixLiteralStringUnion').isUnion([
      t.stringLiteral('Hello World'),
      t.stringLiteral('Bonjour World'),
      t.stringLiteral('Hola World'),
    ]);
    type('SuffixLiteralStringWithUnion').isUnion([
      t.stringLiteral('Hello World'),
      t.stringLiteral('Hello Everyone'),
    ]);
  });

  test('Literal', () => {
    type('Literal').isUnion([t.string(), t.number(), t.bigInt(), t.booleanLiteral()]);
  });

  test('Split', () => {
    type('SplitEmptyStringBySpace').isTuple([]);
    type('SplitEmptyStringByEmptyString').isTuple([]);
    type('SplitEmptyStringByString').isTuple([]);
    type('SplitBySpace').isTuple(['Hello', 'World,', 'How', 'are', 'you?'].map(t.stringLiteral));
    type('SplitByEmptyString').isTuple(['H', 'e', 'l', 'l', 'o'].map(t.stringLiteral));
    // This will use any string character as a delimiter, thus removing 1/2 characters
    type('SplitByString').isTuple(['H', 'l', 'o'].map(t.stringLiteral));
  });
});
