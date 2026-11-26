import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, test, expect, afterAll } from 'vitest';
import type { Core } from '@strapi/types';
import { resolveMiddlewares } from '../middleware';

// An ESM `.js` middleware with only a named export, loaded through Node's `require(esm)`:
// `importDefault` returns the namespace object, which has no `__esModule` and no `default`.
const esmNamespaceWithoutDefault = Object.freeze(
  Object.assign(Object.create(null), { audit: () => () => {} })
);

const createStrapi = (middlewares: Record<string, unknown>, distRoot = os.tmpdir()) =>
  ({
    middleware: (uid: string) => middlewares[uid],
    dirs: { dist: { root: distRoot } },
  }) as unknown as Core.Strapi;

describe('resolveMiddlewares', () => {
  const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-middleware-test-')));

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('Instantiates a middleware factory referenced by name', () => {
    const handler = () => {};
    const strapi = createStrapi({ 'global::audit': () => handler });

    expect(resolveMiddlewares(['global::audit'], strapi)).toStrictEqual([
      { name: 'global::audit', handler },
    ]);
    expect(resolveMiddlewares([{ name: 'global::audit' }], strapi)).toStrictEqual([
      { name: 'global::audit', handler },
    ]);
  });

  test('Throws when a middleware referenced by string has no factory, naming its uid', () => {
    const strapi = createStrapi({ 'global::audit': esmNamespaceWithoutDefault });

    expect(() => resolveMiddlewares(['global::audit'], strapi)).toThrow(
      'Middleware "global::audit" is not a function (no default export?)'
    );
  });

  test('Throws when a middleware referenced by { name } has no factory, naming its uid', () => {
    const strapi = createStrapi({ 'global::audit': esmNamespaceWithoutDefault });

    expect(() => resolveMiddlewares([{ name: 'global::audit' }], strapi)).toThrow(
      'Middleware "global::audit" is not a function (no default export?)'
    );
  });

  test('Throws a not found error when a middleware referenced by { name } is not registered', () => {
    const strapi = createStrapi({});

    expect(() => resolveMiddlewares([{ name: 'global::missing' }], strapi)).toThrow(
      'Middleware global::missing not found.'
    );
  });

  test('Throws when a middleware referenced by { resolve } has no factory, naming its file', () => {
    // A CommonJS module without `__esModule` and without a function export has the same shape
    // `importDefault` returns for an ESM module without a default export.
    const file = path.join(tmpDir, 'middlewares', 'audit.js');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'exports.audit = () => () => {};\n');

    expect(() =>
      resolveMiddlewares([{ resolve: './middlewares/audit.js' }], createStrapi({}, tmpDir))
    ).toThrow(
      `Middleware "./middlewares/audit.js" is not a function (no default export?) in ${file}`
    );
  });
});
