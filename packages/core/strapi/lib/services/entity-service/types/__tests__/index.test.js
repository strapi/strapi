'use strict';

const path = require('path');
const { t } = require('ts-zen');

const { createTypeSelector } = require('./test.utils');

const DEFINITIONS_PATH = path.join('utils', 'array.d.ts');

/**
 * @type {import('ts-zen').AssertTypeSelector<typeof import('./definitions/index')>}
 */
let type;

describe('Entity Service', () => {
  beforeAll(() => {
    type = createTypeSelector(DEFINITIONS_PATH);
  });

  test('', () => {
    type('');
  });
});
