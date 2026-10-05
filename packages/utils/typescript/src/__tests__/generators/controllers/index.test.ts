import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { generateControllersDefinitions } from '../../../generators/controllers';
import { createLogger } from '../../../generators/utils';

// prettier is loaded through a dynamic import that jest cannot run; the formatting is not under test
jest.mock('../../../generators/utils', () => ({
  ...jest.requireActual('../../../generators/utils'),
  format: jest.fn(async (content: string) => content),
}));

// Compare on the printed structure rather than on prettier's line breaks
const normalize = (content: string) => content.replace(/\s+/g, ' ').replace(/;/g, '');

const outputFile = async (file: string, content: string) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
};

const createApp = async (files: Record<string, string>, controllers: string[]) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'strapi-typegen-controllers-'));

  for (const [file, content] of Object.entries(files)) {
    await outputFile(path.join(root, file), content);
  }

  const strapi = {
    dirs: { app: { api: path.join(root, 'src', 'api') } },
    controllers: Object.fromEntries(controllers.map((uid) => [uid, {}])),
  };

  return { root, strapi, pwd: path.join(root, 'types', 'generated') };
};

describe('generateControllersDefinitions', () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  const generate = async (files: Record<string, string>, controllers: string[]) => {
    const { root, strapi, pwd } = await createApp(files, controllers);
    roots.push(root);

    const logger = createLogger({ silent: true });
    const { output } = await generateControllersDefinitions({ strapi, pwd, logger });

    return { output, normalized: normalize(output), logger };
  };

  test('registers api controllers in the global AppControllers registry', async () => {
    const { normalized } = await generate(
      {
        'src/api/article/controllers/article.ts': '',
        'src/api/article/controllers/randomArticleExporter.ts': '',
        'src/api/category/controllers/category.ts': '',
      },
      ['api::article.article', 'api::article.random-article-exporter', 'api::category.category']
    );

    // The file must be a module for the global augmentation to be allowed
    expect(normalized).toContain('export {}');
    expect(normalized).toContain(
      'declare global { namespace Strapi { namespace Registries { interface AppControllers {'
    );
    // Registries are global: no module augmentation of @strapi/strapi is involved
    expect(normalized).not.toContain('declare module');

    expect(normalized).toContain(
      "'api::article.article': ControllerInstance<typeof import('../../src/api/article/controllers/article')>"
    );
    expect(normalized).toContain(
      "'api::article.random-article-exporter': ControllerInstance<typeof import('../../src/api/article/controllers/randomArticleExporter')>"
    );
    expect(normalized).toContain(
      "'api::category.category': ControllerInstance<typeof import('../../src/api/category/controllers/category')>"
    );
  });

  test('resolves the instance type from the default export, falling back to unknown', async () => {
    const { normalized } = await generate({ 'src/api/article/controllers/article.ts': '' }, [
      'api::article.article',
    ]);

    expect(normalized).toContain(
      'type ControllerInstance<TModule> = TModule extends { default: infer TExport } ? TExport extends (...args: any[]) => infer TInstance ? TInstance : TExport : unknown'
    );
  });

  test('only emits controllers registered at runtime', async () => {
    const { output } = await generate(
      {
        'src/api/article/controllers/article.ts': '',
        'src/api/article/controllers/excluded.ts': '',
        'src/api/draft/controllers/draft.ts': '',
      },
      ['api::article.article', 'plugin::upload.upload', 'admin::user']
    );

    expect(output).toContain("'api::article.article'");
    expect(output).not.toContain('excluded');
    expect(output).not.toContain('draft');
    expect(output).not.toContain('plugin::');
    expect(output).not.toContain('admin::');
  });

  test('ignores api services, which register under the same uids', async () => {
    const { root, strapi, pwd } = await createApp({ 'src/api/article/services/article.ts': '' }, [
      'api::article.article',
    ]);
    roots.push(root);

    const logger = createLogger({ silent: true });
    const { output } = await generateControllersDefinitions({ strapi, pwd, logger });

    expect(output).toContain("The app doesn't have any controllers yet.");
  });

  test('ignores declaration files, non source files and hidden directories', async () => {
    const { output } = await generate(
      {
        'src/api/article/controllers/article.ts': '',
        'src/api/article/controllers/article.d.ts': '',
        'src/api/article/controllers/README.md': '',
        'src/api/article/controllers/schema.json': '{}',
        'src/api/.hidden/controllers/hidden.ts': '',
      },
      ['api::article.article', 'api::article.readme', 'api::article.schema', 'api::hidden.hidden']
    );

    expect(output.match(/'api::article\.article'/g)).toHaveLength(1);
    expect(output).not.toContain('README');
    expect(output).not.toContain('schema');
    expect(output).not.toContain('hidden');
  });

  test('prefers the TypeScript source when several files resolve to the same uid', async () => {
    const { output, logger } = await generate(
      {
        'src/api/article/controllers/article.js': '',
        'src/api/article/controllers/article.ts': '',
      },
      ['api::article.article']
    );

    expect(output).toContain("typeof import('../../src/api/article/controllers/article')");
    expect(output.match(/'api::article\.article'/g)).toHaveLength(1);
    expect(logger.warnings).toBe(1);
  });

  test('sorts the entries by uid', async () => {
    const { output } = await generate(
      {
        'src/api/zebra/controllers/zebra.ts': '',
        'src/api/article/controllers/article.ts': '',
      },
      ['api::zebra.zebra', 'api::article.article']
    );

    expect(output.indexOf("'api::article.article'")).toBeLessThan(
      output.indexOf("'api::zebra.zebra'")
    );
  });

  test('emits a placeholder when the app has no controllers', async () => {
    const { output } = await generate({}, ['plugin::upload.upload']);

    expect(output).toBe(`/*
 * The app doesn't have any controllers yet.
 */
`);
  });

  test('emits a placeholder when no api controller has a source file', async () => {
    const { output } = await generate(
      { 'src/api/article/content-types/article/schema.json': '{}' },
      ['api::article.article']
    );

    expect(output).toContain("The app doesn't have any controllers yet.");
  });
});
