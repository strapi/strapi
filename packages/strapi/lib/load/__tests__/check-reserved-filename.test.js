const checkReservedFilename = require('../check-reserved-filename');

describe('check-reserved-filename', () => {
  const table = [
    // matches
    ['config/functions.json', true],
    ['config/functions/bootstrapi.js', true],
    ['config/layout.json', true],
    ['config/hook.json', true],
    ['config/middleware.json', true],
    ['config/environments/test/database.json', true],
    ['config/environments/development/request.json', true],
    ['config/environments/production/server.json', true],
    ['config/environments/staging/response.json', true],
    ['config/environments/qa/security.json', true],

    // dont match
    ['config/application.json', false],
    ['config/custom.json', false],
    ['config/environments/qa/custom.json', false],
    ['config/environments/qa/other.json', false],
  ];

  test.each(table)('Path %s should return %s', (path, expected) => {
    expect(checkReservedFilename(path)).toBe(expected);
  });
});
