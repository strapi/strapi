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
      contentTypes: {},
      components: {},
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

  test('removes previously generated strict artifacts when they are disabled', async () => {
    const { root, strapi, generated } = await createApp({
      'services.d.ts': '// stale',
      'controllers.d.ts': '// stale',
      'policies.d.ts': '// stale',
      'strict.d.ts': '// stale',
      'plugins.d.ts': '// keep',
      'contentTypes.d.ts': '// keep',
    });

    await generate({
      strapi,
      pwd: root,
      artifacts: { services: false, controllers: false, policies: false, strict: false },
      logger: { silent: true },
    });

    expect(await pathExists(generated('services.d.ts'))).toBe(false);
    expect(await pathExists(generated('controllers.d.ts'))).toBe(false);
    expect(await pathExists(generated('policies.d.ts'))).toBe(false);
    expect(await pathExists(generated('strict.d.ts'))).toBe(false);
    expect(await pathExists(generated('plugins.d.ts'))).toBe(true);
    expect(await pathExists(generated('contentTypes.d.ts'))).toBe(true);
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
    const { root, strapi, generated } = await createApp({ 'services.d.ts': '// keep' });

    await generate({ strapi, pwd: root, artifacts: { strict: true }, logger: { silent: true } });

    expect(await fs.readFile(generated('services.d.ts'), 'utf8')).toBe('// keep');
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
});
