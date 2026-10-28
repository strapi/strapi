import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { generate } from '../../generators';
import { pathExists } from '../../generators/utils';

// prettier is loaded through a dynamic import that jest cannot run; the formatting is not under test
jest.mock('../../generators/utils', () => ({
  ...jest.requireActual('../../generators/utils'),
  format: jest.fn(async (content: string) => content),
}));

const outputFile = async (file: string, content: string) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
};

describe('generate', () => {
  const roots: string[] = [];

  const createApp = async (generated: Record<string, string> = {}) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'strapi-typegen-'));
    roots.push(root);

    for (const [file, content] of Object.entries(generated)) {
      await outputFile(path.join(root, 'types', 'generated', file), content);
    }

    const strapi = {
      dirs: { app: { api: path.join(root, 'src', 'api') } },
      services: {},
      controllers: {},
      policies: {},
      middlewares: {},
      contentTypes: {},
      components: {},
      config: { get: (_path: string, fallback?: unknown) => fallback },
    };

    return {
      root,
      strapi,
      generated: (file: string) => path.join(root, 'types', 'generated', file),
    };
  };

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  test('writes the strict opt-in when the artifact is enabled', async () => {
    const { root, strapi, generated } = await createApp();

    await generate({ strapi, pwd: root, artifacts: { strict: true }, logger: { silent: true } });

    expect(await fs.readFile(generated('strict.d.ts'), 'utf8')).toContain(
      "import type {} from '@strapi/strapi/strict-types';"
    );
  });

  test('writes the services, controllers, policies and middlewares as .ts files with a lint header', async () => {
    const { root, strapi, generated } = await createApp();

    await generate({
      strapi,
      pwd: root,
      artifacts: { services: true, controllers: true, policies: true, middlewares: true },
      logger: { silent: true },
    });

    expect((await fs.readdir(path.join(root, 'types', 'generated'))).sort()).toEqual([
      'controllers.ts',
      'middlewares.ts',
      'policies.ts',
      'services.ts',
    ]);
    for (const file of ['services.ts', 'controllers.ts', 'policies.ts', 'middlewares.ts']) {
      expect(await fs.readFile(generated(file), 'utf8')).toMatch(
        /^\/\* eslint-disable \*\/\n\/\* oxlint-disable \*\/\n/
      );
    }
  });

  test('replaces the .d.ts files an earlier generation wrote for the .ts artifacts', async () => {
    const { root, strapi } = await createApp({
      'services.d.ts': '// stale',
      'controllers.d.ts': '// stale',
      'policies.d.ts': '// stale',
      'middlewares.d.ts': '// stale',
      'contentTypes.d.ts': '// keep',
    });

    await generate({
      strapi,
      pwd: root,
      artifacts: { services: true, controllers: true, policies: true, middlewares: true },
      logger: { silent: true },
    });

    expect((await fs.readdir(path.join(root, 'types', 'generated'))).sort()).toEqual([
      'contentTypes.d.ts',
      'controllers.ts',
      'middlewares.ts',
      'policies.ts',
      'services.ts',
    ]);
  });

  test('removes previously generated strict artifacts when they are disabled', async () => {
    const { root, strapi, generated } = await createApp({
      'services.ts': '// stale',
      'services.d.ts': '// stale',
      'controllers.ts': '// stale',
      'controllers.d.ts': '// stale',
      'policies.ts': '// stale',
      'policies.d.ts': '// stale',
      'middlewares.ts': '// stale',
      'middlewares.d.ts': '// stale',
      'strict.d.ts': '// stale',
      'plugins.d.ts': '// keep',
      'contentTypes.d.ts': '// keep',
    });

    await generate({
      strapi,
      pwd: root,
      artifacts: {
        services: false,
        controllers: false,
        policies: false,
        middlewares: false,
        strict: false,
      },
      logger: { silent: true },
    });

    for (const artifact of ['services', 'controllers', 'policies', 'middlewares']) {
      expect(await pathExists(generated(`${artifact}.ts`))).toBe(false);
      expect(await pathExists(generated(`${artifact}.d.ts`))).toBe(false);
    }
    expect(await pathExists(generated('strict.d.ts'))).toBe(false);
    expect(await pathExists(generated('plugins.d.ts'))).toBe(true);
    expect(await pathExists(generated('contentTypes.d.ts'))).toBe(true);
  });

  test('with strict types off, writes only the content-types and components files', async () => {
    const { root, strapi } = await createApp({
      'plugins.d.ts': "import type {} from '@vendor/plugin/strapi-server';\n",
      'services.ts': '// stale',
      'strict.d.ts': '// stale',
    });

    // `getTypeArtifacts` in @strapi/strapi with `typescript.strictTypes` off
    await generate({
      strapi,
      pwd: root,
      artifacts: {
        contentTypes: true,
        components: true,
        plugins: false,
        services: false,
        controllers: false,
        policies: false,
        middlewares: false,
        strict: false,
      },
      logger: { silent: true },
    });

    expect((await fs.readdir(path.join(root, 'types', 'generated'))).sort()).toEqual([
      'components.d.ts',
      'contentTypes.d.ts',
    ]);
  });

  test('toggling strict types rewrites the schema registries in the same files', async () => {
    const { root, strapi, generated } = await createApp();
    strapi.contentTypes = {
      'api::article.article': {
        uid: 'api::article.article',
        modelType: 'contentType',
        kind: 'collectionType',
        info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
        attributes: {},
      },
    };
    strapi.components = {
      'shared.seo': {
        uid: 'shared.seo',
        modelType: 'component',
        category: 'shared',
        info: { displayName: 'Seo' },
        attributes: {},
      },
    };

    const run = (strict: boolean) =>
      generate({
        strapi,
        pwd: root,
        artifacts: { contentTypes: true, components: true, strict },
        logger: { silent: true },
      });

    await run(true);
    for (const file of ['contentTypes.d.ts', 'components.d.ts']) {
      const content = await fs.readFile(generated(file), 'utf8');
      expect(content).toContain('declare global');
      expect(content).not.toContain('namespace Public');
    }

    await run(false);
    for (const file of ['contentTypes.d.ts', 'components.d.ts']) {
      const content = await fs.readFile(generated(file), 'utf8');
      expect(content).toContain("declare module '@strapi/strapi'");
      expect(content).not.toContain('declare global');
    }
  });

  test('leaves artifacts that are neither enabled nor disabled untouched', async () => {
    const { root, strapi, generated } = await createApp({ 'services.ts': '// keep' });

    await generate({ strapi, pwd: root, artifacts: { strict: true }, logger: { silent: true } });

    expect(await fs.readFile(generated('services.ts'), 'utf8')).toBe('// keep');
  });

  test('logs the error and stops removing disabled artifacts when a removal fails', async () => {
    const { root, strapi, generated } = await createApp({ 'controllers.ts': '// stale' });
    // A directory at the artifact path makes the non-recursive removal fail
    await fs.mkdir(generated('services.ts'), { recursive: true });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const consoleInfo = jest.spyOn(console, 'info').mockImplementation(() => {});

    try {
      await generate({
        strapi,
        pwd: root,
        artifacts: { services: false, controllers: false },
        logger: { silent: false },
      });

      expect(consoleError).toHaveBeenCalledTimes(1);
      expect(consoleError.mock.calls[0].join(' ')).toMatch(
        /An error occurred while removing .*services.* types from the filesystem: .+\. Exiting/
      );
      // The generation exits before it reaches the next disabled artifact
      expect(await fs.readFile(generated('controllers.ts'), 'utf8')).toBe('// stale');
    } finally {
      consoleError.mockRestore();
      consoleInfo.mockRestore();
    }
  });

  test('disabling an artifact that was never generated is a no-op', async () => {
    const { root, strapi } = await createApp();

    const reports = await generate({
      strapi,
      pwd: root,
      artifacts: { services: false },
      logger: { silent: true },
    });

    expect(reports).toEqual({});
    expect(await pathExists(path.join(root, 'types', 'generated'))).toBe(false);
  });

  describe('reads `allowJs` from the application tsconfig', () => {
    // A JS service is typed from the JS file itself only with `allowJs`
    const generateWithTsconfig = async (tsconfig: string | undefined) => {
      const { root, strapi, generated } = await createApp();
      await outputFile(
        path.join(root, 'src', 'api', 'legacy', 'services', 'legacy.js'),
        'module.exports = () => ({ ping: () => "pong" });'
      );
      if (tsconfig !== undefined) {
        await outputFile(path.join(root, 'tsconfig.json'), tsconfig);
      }
      strapi.services = { 'api::legacy.legacy': {} };

      await generate({
        strapi,
        pwd: root,
        artifacts: { services: true },
        logger: { silent: true },
      });

      return fs.readFile(generated('services.ts'), 'utf8');
    };

    test('types a JS source from the JS file when the tsconfig enables it', async () => {
      const output = await generateWithTsconfig(
        JSON.stringify({ compilerOptions: { allowJs: true }, include: ['src'] })
      );

      expect(output.replace(/\s+/g, ' ').replace(/;/g, '')).toContain(
        "'api::legacy.legacy': ServiceInstance<{ default: typeof import('../../src/api/legacy/services/legacy.js') }>"
      );
    });

    test('also reads it from an extended tsconfig', async () => {
      const { root, strapi, generated } = await createApp();
      await outputFile(
        path.join(root, 'src', 'api', 'legacy', 'services', 'legacy.js'),
        'module.exports = () => ({ ping: () => "pong" });'
      );
      await outputFile(
        path.join(root, 'tsconfig.base.json'),
        JSON.stringify({ compilerOptions: { allowJs: true } })
      );
      await outputFile(
        path.join(root, 'tsconfig.json'),
        JSON.stringify({ extends: './tsconfig.base.json', include: ['src'] })
      );
      strapi.services = { 'api::legacy.legacy': {} };

      await generate({
        strapi,
        pwd: root,
        artifacts: { services: true },
        logger: { silent: true },
      });

      expect(await fs.readFile(generated('services.ts'), 'utf8')).toContain(
        "typeof import('../../src/api/legacy/services/legacy.js')"
      );
    });

    test.each([
      ['the tsconfig does not enable it', JSON.stringify({ include: ['src'] })],
      ['there is no tsconfig', undefined],
      ['the tsconfig cannot be parsed', '{ "compilerOptions": '],
      [
        'the tsconfig has errors',
        JSON.stringify({ compilerOptions: { allowJs: true, module: 'unknown' }, include: ['src'] }),
      ],
    ])('registers a JS source as unknown when %s', async (_, tsconfig) => {
      const output = await generateWithTsconfig(tsconfig);

      expect(output).toContain("'api::legacy.legacy': unknown");
      expect(output).not.toContain('legacy.js');
    });
  });
});
