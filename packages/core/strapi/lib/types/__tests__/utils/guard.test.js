'use strict';

const path = require('path');
const { t } = require('ts-zen');

const { createTypeSelector } = require('../test.utils');

const DEFINITIONS_PATH = path.join('utils', 'guard.d.ts');

/**
 * @type {import('ts-zen').AssertTypeSelector<typeof import('../definitions/utils/guard')>}
 */
let type;

describe('Utils.Guard', () => {
  beforeAll(() => {
    type = createTypeSelector(DEFINITIONS_PATH);
  });

  test('Never Guard', () => {
    type('NeverGuardGetsNeverWithDefaultFallback').isUnknown();
    type('NeverGuardGetsNeverWithCustomFallback').isString();
    type('NeverGuardGetsAny').isAny();
    type('NeverGuardGetsNull').isNull();
    type('NeverGuardGetsUndefined').isUndefined();
    type('NeverGuardGetsUnknown').isUnknown();
  });

  describe('OfTypes', () => {
    test('Single Type', () => {
      type('OfTypesNeverGetsNeverWithFallback').isString();
      type('OfTypesNeverGetsNeverWithoutFallback').isUnknown();

      type('OfTypesUndefined').isUnknown();
      type('OfTypesUndefinedGetsString').isString();

      type('OfTypesNull').isUnknown();
      type('OfTypesNullGetsString').isString();

      type('OfTypesUnknown').isNull();
      type('OfTypesUnknownGetString').isString();

      type('OfTypesAnyGetsAny').isUnknown();
      type('OfTypesAnyGetsString').isUnknown();

      type('OfTypeUnionGetsMatchingUnion').isUnknown();
      type('OfTypeUnionGetsUnionElement').isString();
    });

    test('Multiple Type Guard', () => {
      type('OfTypesStringAndNumberGetsString').isUnknown();
      type('OfTypesStringAndNumberGetsNumber').isUnknown();
      type('OfTypesStringAndNumberGetsUnionOfStringNumber').isUnion([t.string(), t.number()]);
      type('OfTypesStringAndNumberGetsBoolean').isBoolean();
    });
  });
});
