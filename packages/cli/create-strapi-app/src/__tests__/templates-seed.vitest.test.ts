import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { describe, expect, it } from 'vitest';

/**
 * The example templates ship a `scripts/seed.js` that uploads the images in `data/uploads`
 * through the upload service and creates entries through the Document Service. These tests
 * run the script against a stubbed `strapi` and check what it hands to both services.
 */

const templatesDir = path.resolve(__dirname, '..', '..', 'templates');

const templates = fs
  .readdirSync(templatesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((template) => fs.existsSync(path.join(templatesDir, template, 'scripts', 'seed.js')));

type UploadCall = { files: unknown; data: unknown };
type CreateCall = { uid: string; params: { data: Record<string, unknown>; status?: string } };

// Content type schemas as the template ships them, so the stub reports each type's real options
const readContentType = (template: string, uid: string) => {
  const [, name] = uid.split('.');
  const schemaPath = path.join(
    templatesDir,
    template,
    'src',
    'api',
    name,
    'content-types',
    name,
    'schema.json'
  );

  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
};

const runSeed = async (template: string) => {
  const scriptPath = path.join(templatesDir, template, 'scripts', 'seed.js');
  const uploadCalls: UploadCall[] = [];
  const createCalls: CreateCall[] = [];
  const errors: unknown[] = [];

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
    contentType: (uid: string) => readContentType(template, uid),
    documents: (uid: string) => ({
      async create(params: CreateCall['params']) {
        createCalls.push({ uid, params });
        return {};
      },
    }),
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
    { log: () => undefined, error: (...args: unknown[]) => errors.push(args) }
  );

  const exitCode = await exited;

  return { exitCode, uploadCalls, createCalls, errors };
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

  it.each(templates)(
    '%s: creates draft & publish entries as published, and other entries without a status',
    async (template) => {
      const { exitCode, createCalls, errors } = await runSeed(template);

      expect(exitCode).toBe(0);
      // createEntry logs and swallows errors, so a failing create would otherwise go unnoticed
      expect(errors).toEqual([]);
      expect(createCalls.map(({ uid }) => uid)).toContain('api::article.article');

      for (const { uid, params } of createCalls) {
        const { draftAndPublish } = readContentType(template, uid).options ?? {};

        if (draftAndPublish === true) {
          expect(params.status, uid).toBe('published');
        } else {
          expect(params, uid).not.toHaveProperty('status');
        }

        // The Document Service drops `publishedAt` from `data`, so the seed must not rely on it
        expect(params.data, uid).not.toHaveProperty('publishedAt');
      }
    }
  );
});
