import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadConfigFile } from '../load-config-file';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-load-config-file-'));

const write = (name: string, content: string) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
};

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('loadConfigFile', () => {
  it('loads a .cjs file as CommonJS inside a "type": "module" package', () => {
    write('package.json', JSON.stringify({ type: 'module' }));
    const file = write('index.cjs', 'module.exports = { register() {}, contentTypes: { a: {} } };');

    const loaded = loadConfigFile(file);

    expect(loaded.register).toBeTypeOf('function');
    expect(loaded.contentTypes).toEqual({ a: {} });
  });

  it('loads the default export of a .mjs file', () => {
    const file = write('index.mjs', 'export default { register() {}, contentTypes: { a: {} } };');

    const loaded = loadConfigFile(file);

    expect(loaded.register).toBeTypeOf('function');
    expect(loaded.contentTypes).toEqual({ a: {} });
  });

  it('returns an empty object for unsupported extensions', () => {
    expect(loadConfigFile(write('index.txt', 'a'))).toEqual({});
  });
});
