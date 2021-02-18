'use strict';

const isTruthyEnvVar = require('../is-truthy');

describe('isTruthyEnvVar', () => {
  test('Handles boolean strings', () => {
    expect(isTruthyEnvVar('true')).toBe(true);

    expect(isTruthyEnvVar('false')).toBe(false);
  });

  test('Handle numbers', () => {
    expect(isTruthyEnvVar(1)).toBe(true);

    expect(isTruthyEnvVar(-1)).toBe(false);
    expect(isTruthyEnvVar(0)).toBe(false);
    expect(isTruthyEnvVar(2)).toBe(false);
  });

  test('Handles default booleans', () => {
    expect(isTruthyEnvVar(true)).toBe(true);
    expect(isTruthyEnvVar(false)).toBe(false);
  });

  test('Handles all the other values', () => {
    expect(isTruthyEnvVar(null)).toBe(false);
    expect(isTruthyEnvVar(undefined)).toBe(false);
    expect(isTruthyEnvVar({})).toBe(false);
    expect(isTruthyEnvVar([])).toBe(false);
    expect(isTruthyEnvVar(new Date())).toBe(false);
    expect(isTruthyEnvVar('some text')).toBe(false);
  });
});
