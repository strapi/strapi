'use strict';

const path = require('path');
const importDefault = require('../../import-default');

const getPath = (file) => path.resolve(__dirname, file);

describe('Import Default', () => {
  test('ESM', () => {
    const content = importDefault(getPath('./esm'));

    expect(content).toBeDefined();
    expect(content).toMatchObject(
      expect.objectContaining({
        foo: 'bar',
        cb: expect.any(Function),
      })
    );
    expect(content.cb()).toBe(42);
  });

  test('CJS', () => {
    const content = importDefault(getPath('./cjs'));

    expect(content).toBeDefined();
    expect(content).toMatchObject(
      expect.objectContaining({
        foo: 'bar',
        cb: expect.any(Function),
      })
    );
    expect(content.cb()).toBe(42);
  });
});
