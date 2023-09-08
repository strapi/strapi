'use strict';

const path = require('path');
const { t } = require('ts-zen');

const { createTypeSelector } = require('../test.utils');

const DEFINITIONS_PATH = path.join('params', 'attributes.d.ts');

/**
 * @type {import('ts-zen').AssertTypeSelector<typeof import('../definitions/params/attributes')>}
 */
let type;

describe('Entity Service', () => {
  beforeAll(() => {
    type = createTypeSelector(DEFINITIONS_PATH);
  });

  test('Non Filterable Kind is Union of Password and Dynamic Zone', () => {
    type('NonFilterableKindResolvesToPasswordOrDynamicZone').isUnion([
      t.stringLiteral('password'),
      t.stringLiteral('dynamiczone'),
    ]);
  });

  test('Filterable Kind resolves to valid filterable kinds', () => {
    type('FilterableKindResolvesToValidFilterableKind').isUnion([
      t.stringLiteral('string'),
      t.stringLiteral('boolean'),
      t.stringLiteral('text'),
      t.stringLiteral('richtext'),
      t.stringLiteral('email'),
      t.stringLiteral('date'),
      t.stringLiteral('time'),
      t.stringLiteral('datetime'),
      t.stringLiteral('timestamp'),
      t.stringLiteral('integer'),
      t.stringLiteral('biginteger'),
      t.stringLiteral('float'),
      t.stringLiteral('decimal'),
      t.stringLiteral('uid'),
      t.stringLiteral('enumeration'),
      t.stringLiteral('json'),
      t.stringLiteral('media'),
      t.stringLiteral('relation'),
      t.stringLiteral('component'),
    ]);
  });
});
