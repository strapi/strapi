'use strict';

const checkReservedFilename = require('../check-reserved-filename');

describe('check-reserved-filename', () => {
  const table = [
    // matches
    ['config/functions.json', true],
    ['config/functions/bootstrapi.js', true],
    ['config/layout.json', true],
    ['config/hook.json', true],
    ['config/middleware.json', true],
    // dont match
    ['config/application.json', false],
    ['config/custom.json', false],
  ];

  test.each(table)('Path %s should return %s', (path, expected) => {
    expect(checkReservedFilename(path)).toBe(expected);
  });
});
