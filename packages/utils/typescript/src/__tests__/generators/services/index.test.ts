import os from 'node:os';
import path from 'node:path';
import fse from 'fs-extra';

import { generateServicesDefinitions } from '../../../generators/services';
import { createLogger } from '../../../generators/utils';

// prettier is loaded through a dynamic import that jest cannot run; the formatting is not under test
jest.mock('../../../generators/utils', () => ({
  ...jest.requireActual('../../../generators/utils'),
  format: jest.fn(async (content: string) => content),
}));

// Compare on the printed structure rather than on prettier's line breaks
const normalize = (content: string) => content.replace(/\s+/g, ' ').replace(/;/g, '');

const createApp = async (files: Record<string, string>, services: string[]) => {
  const root = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-typegen-services-'));

  for (const [file, content] of Object.entries(files)) {
    await fse.outputFile(path.join(root, file), content);
  }

  const strapi = {
    dirs: { app: { api: path.join(root, 'src', 'api') } },
    services: Object.fromEntries(services.map((uid) => [uid, {}])),
  };

  return { root, strapi, pwd: path.join(root, 'types', 'generated') };
};

describe('generateServicesDefinitions', () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => fse.remove(root)));
  });

  const generate = async (files: Record<string, string>, services: string[]) => {
    const { root, strapi, pwd } = await createApp(files, services);
    roots.push(root);

    const logger = createLogger({ silent: true });
    const { output } = await generateServicesDefinitions({ strapi, pwd, logger });

    return { output, normalized: normalize(output), logger };
  };

  test('registers api services from their source file', async () => {
    const { normalized } = await generate(
      {
        'src/api/article/services/article.ts': '',
        'src/api/article/services/randomArticleGenerator.ts': '',
        'src/api/category/services/category.ts': '',
      },
      ['api::article.article', 'api::article.random-article-generator', 'api::category.category']
    );

    // The file must be a module for the module declaration to augment @strapi/strapi
    expect(normalized).toContain("import type { Core } from '@strapi/strapi'");
    expect(normalized).toContain(
      "declare module '@strapi/strapi' { export namespace Public { export interface ServiceRegistry {"
    );
    // TS 6 rejects the legacy `export module` form
    expect(normalized).not.toMatch(/export module Public\b/);

    expect(normalized).toContain(
      "'api::article.article': ServiceInstance<typeof import('../../src/api/article/services/article')>"
    );
    expect(normalized).toContain(
      "'api::article.random-article-generator': ServiceInstance<typeof import('../../src/api/article/services/randomArticleGenerator')>"
    );
    expect(normalized).toContain(
      "'api::category.category': ServiceInstance<typeof import('../../src/api/category/services/category')>"
    );
  });

  test('resolves the instance type from the default export, falling back to Core.Service', async () => {
    const { normalized } = await generate({ 'src/api/article/services/article.ts': '' }, [
      'api::article.article',
    ]);

    expect(normalized).toContain(
      'type ServiceInstance<TModule> = TModule extends { default: infer TExport } ? TExport extends (...args: any[]) => infer TInstance ? TInstance : TExport : Core.Service'
    );
  });

  test('only emits services registered at runtime', async () => {
    const { output } = await generate(
      {
        'src/api/article/services/article.ts': '',
        'src/api/article/services/excluded.ts': '',
        'src/api/draft/services/draft.ts': '',
      },
      ['api::article.article', 'plugin::upload.upload', 'admin::user']
    );

    expect(output).toContain("'api::article.article'");
    expect(output).not.toContain('excluded');
    expect(output).not.toContain('draft');
    expect(output).not.toContain('plugin::');
    expect(output).not.toContain('admin::');
  });

  test('ignores declaration files, non source files and hidden directories', async () => {
    const { output } = await generate(
      {
        'src/api/article/services/article.ts': '',
        'src/api/article/services/article.d.ts': '',
        'src/api/article/services/README.md': '',
        'src/api/article/services/schema.json': '{}',
        'src/api/.hidden/services/hidden.ts': '',
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
        'src/api/article/services/article.js': '',
        'src/api/article/services/article.ts': '',
      },
      ['api::article.article']
    );

    expect(output).toContain("typeof import('../../src/api/article/services/article')");
    expect(output.match(/'api::article\.article'/g)).toHaveLength(1);
    expect(logger.warnings).toBe(1);
  });

  test('sorts the entries by uid', async () => {
    const { output } = await generate(
      {
        'src/api/zebra/services/zebra.ts': '',
        'src/api/article/services/article.ts': '',
      },
      ['api::zebra.zebra', 'api::article.article']
    );

    expect(output.indexOf("'api::article.article'")).toBeLessThan(
      output.indexOf("'api::zebra.zebra'")
    );
  });

  test('emits a placeholder when the app has no services', async () => {
    const { output } = await generate({}, ['plugin::upload.upload']);

    expect(output).toBe(`/*
 * The app doesn't have any services yet.
 */
`);
  });

  test('emits a placeholder when no api service has a source file', async () => {
    const { output } = await generate(
      { 'src/api/article/content-types/article/schema.json': '{}' },
      ['api::article.article']
    );

    expect(output).toContain("The app doesn't have any services yet.");
  });
});
