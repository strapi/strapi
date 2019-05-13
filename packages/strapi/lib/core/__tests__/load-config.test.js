const loadConfig = require('../load-config');
const fs = require('fs-extra');

describe('Load config', () => {
  test('Throw on non existant config folder', () => {
    fs.existsSync = jest.fn(() => false);
    expect(loadConfig({ dir: '/' })).rejects.toThrow();
  });
});
