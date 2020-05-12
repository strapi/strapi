const loadConfig = require('../load-config');
const fs = require('fs-extra');

describe('Load config', () => {
  test('Throw on non existant config folder', async () => {
    fs.existsSync = jest.fn(() => false);
    await expect(loadConfig({ dir: '/' })).rejects.toThrow();
  });
});
