import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { describe, expect, it } from 'vitest';

/**
 * The example templates ship a `scripts/seed.js` that uploads the images in `data/uploads`
 * through the upload service. These tests run the script against a stubbed `strapi` and
 * check the files it hands to the upload service carry the name the service reads.
 */

const templatesDir = path.resolve(__dirname, '..', '..', 'templates');

const templates = fs
  .readdirSync(templatesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((template) => fs.existsSync(path.join(templatesDir, template, 'scripts', 'seed.js')));

type UploadCall = { files: unknown; data: unknown };

const runSeed = async (template: string) => {
  const scriptPath = path.join(templatesDir, template, 'scripts', 'seed.js');
  const uploadCalls: UploadCall[] = [];

  const strapi = {
    config: { environment: 'test' },
    log: {},
    store: () => ({ get: async () => undefined, set: async () => undefined }),
    db: {
      query: (uid: string) => ({
        findOne: async () => (uid === 'plugin::users-permissions.role' ? { id: 1 } : null),
        create: async () => ({}),
      }),
    },
    documents: () => ({ create: async () => ({}) }),
    plugin: () => ({
      service: () => ({
        async upload(args: UploadCall) {
          uploadCalls.push(args);
          return [{ id: uploadCalls.length }];
        },
      }),
    }),
  };

  let resolveExit: (code: number) => void = () => undefined;
  const exited = new Promise<number>((resolve) => {
    resolveExit = resolve;
  });

  const stubbedModules: Record<string, unknown> = {
    'fs-extra': { statSync: () => ({ size: 1 }) },
    '@strapi/strapi': {
      compileStrapi: async () => ({}),
      createStrapi: () => ({
        load: async () => ({ ...strapi, destroy: async () => undefined }),
      }),
    },
  };

  const scriptRequire = (id: string) => {
    if (id in stubbedModules) {
      return stubbedModules[id];
    }

    return require(require.resolve(id, { paths: [path.dirname(scriptPath), __dirname] }));
  };

  const module = { exports: {} };
  const wrapper = vm.runInThisContext(
    `(function (exports, require, module, __filename, __dirname, strapi, process, console) {${fs.readFileSync(scriptPath, 'utf8')}\n})`
  );

  wrapper(
    module.exports,
    scriptRequire,
    module,
    scriptPath,
    path.dirname(scriptPath),
    strapi,
    { exit: (code: number) => resolveExit(code) },
    { log: () => undefined, error: () => undefined }
  );

  const exitCode = await exited;

  return { exitCode, uploadCalls };
};

describe('create-strapi-app example templates seed script', () => {
  it.each(templates)('%s: uploads each file with its original name', async (template) => {
    const { exitCode, uploadCalls } = await runSeed(template);

    expect(exitCode).toBe(0);
    expect(uploadCalls.length).toBeGreaterThan(0);

    for (const { files } of uploadCalls) {
      expect(Array.isArray(files)).toBe(true);

      for (const file of files as Array<Record<string, unknown>>) {
        expect(file.originalFilename).toBe(path.basename(file.filepath as string));
      }
    }
  });
});
