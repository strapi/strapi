import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import * as ts from 'typescript';

import { generateControllersDefinitions } from '../../../generators/controllers';
import { createLogger } from '../../../generators/utils';

// prettier is loaded through a dynamic import that jest cannot run; the formatting is not under test
jest.mock('../../../generators/utils', () => ({
  ...jest.requireActual('../../../generators/utils'),
  format: jest.fn(async (content: string) => content),
}));

// Compare on the printed structure rather than on prettier's line breaks
const normalize = (content: string) => content.replace(/\s+/g, ' ').replace(/;/g, '');

// Output of an application without contracts: no contract helper, no contract reference, and its
// TypeScript sources marked as inferred
const NO_CONTRACT_OUTPUT = `export {};

/**
 * Type of the controller exposed by a controller module: the return type of its default export
 * when it is a factory, the default export itself otherwise.
 */
type ControllerInstance<TModule> = TModule extends {
    default: infer TExport;
} ? 0 extends 1 & TExport ? unknown : TExport extends (...args: any[]) => infer TInstance ? TInstance : TExport : unknown;

declare global {
    namespace Strapi {
        namespace Registries {
            interface AppControllers {
                'api::article.article': ControllerInstance<typeof import('../../src/api/article/controllers/article.js')>;
                'api::article.legacy': unknown;
            }
            interface InferredControllers {
                'api::article.article': true;
            }
        }
    }
}
`;

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
      "'api::article.article': ControllerInstance<typeof import('../../src/api/article/controllers/article.js')>"
    );
    expect(normalized).toContain(
      "'api::article.random-article-exporter': ControllerInstance<typeof import('../../src/api/article/controllers/randomArticleExporter.js')>"
    );
    expect(normalized).toContain(
      "'api::category.category': ControllerInstance<typeof import('../../src/api/category/controllers/category.js')>"
    );
  });

  test('resolves the instance type from the default export, falling back to unknown', async () => {
    const { normalized } = await generate({ 'src/api/article/controllers/article.ts': '' }, [
      'api::article.article',
    ]);

    expect(normalized).toContain(
      'type ControllerInstance<TModule> = TModule extends { default: infer TExport } ? 0 extends 1 & TExport ? unknown : TExport extends (...args: any[]) => infer TInstance ? TInstance : TExport : unknown'
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

    expect(output.match(/'api::article\.article': ControllerInstance</g)).toHaveLength(1);
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

    expect(output).toContain("typeof import('../../src/api/article/controllers/article.js')");
    expect(output.match(/'api::article\.article': ControllerInstance</g)).toHaveLength(1);
    expect(logger.warnings).toBe(1);
  });

  test('registers a JS source as unknown, without importing it', async () => {
    const { normalized } = await generate(
      {
        'src/api/article/controllers/article.ts': '',
        'src/api/article/controllers/legacy.js': '',
      },
      ['api::article.article', 'api::article.legacy']
    );

    expect(normalized).toContain("'api::article.legacy': unknown");
    expect(normalized).not.toContain("legacy')");
  });

  test('marks the uids of an application without contracts, without a contract helper', async () => {
    const { output } = await generate(
      {
        'src/api/article/controllers/article.ts':
          'export type ArticleContract = { find(): number };',
        'src/api/article/controllers/legacy.js': '',
      },
      ['api::article.article', 'api::article.legacy']
    );

    expect(output).toBe(NO_CONTRACT_OUTPUT);
  });

  test('registers the ControllerContract export of a controller', async () => {
    const { normalized } = await generate(
      {
        'src/api/article/controllers/article.ts':
          'export type ControllerContract = { find(): Promise<number> };\nexport default () => ({ find: async () => 1 });',
        'src/api/article/controllers/inferred.ts': 'export default () => ({ find: () => 1 });',
        'src/api/article/controllers/legacy.js': '',
        'src/api/article/controllers/other.ts':
          'export type ServiceContract = { find(): number };\nexport default {};',
      },
      ['api::article.article', 'api::article.inferred', 'api::article.legacy', 'api::article.other']
    );

    expect(normalized).toContain(
      "'api::article.article': ControllerContractOf<import('../../src/api/article/controllers/article.js').ControllerContract>"
    );
    // Without a contract export, a controller keeps the type it exports
    expect(normalized).toContain(
      "'api::article.inferred': ControllerInstance<typeof import('../../src/api/article/controllers/inferred.js')>"
    );
    expect(normalized).toContain("'api::article.legacy': unknown");
    // A service contract is not read in a controllers file
    expect(normalized).toContain(
      "'api::article.other': ControllerInstance<typeof import('../../src/api/article/controllers/other.js')>"
    );
    expect(normalized).toContain(
      'type ControllerContractOf<TContract> = 0 extends 1 & TContract ? unknown : TContract'
    );
    expect(normalized.match(/type ControllerContractOf</g)).toHaveLength(1);
    // Only the TypeScript controllers without a contract export are marked as inferred
    expect(normalized).toContain(
      "interface InferredControllers { 'api::article.inferred': true 'api::article.other': true }"
    );
  });

  test('emits no inferred marker when every source exports a contract or is JS', async () => {
    const { normalized } = await generate(
      {
        'src/api/article/controllers/article.ts':
          'export type ControllerContract = { find(): number };\nexport default () => ({ find: () => 1 });',
        'src/api/article/controllers/legacy.js': '',
      },
      ['api::article.article', 'api::article.legacy']
    );

    expect(normalized).toContain("'api::article.article': ControllerContractOf<");
    expect(normalized).not.toContain('InferredControllers');
  });

  test('emits the instance helper only when a source registers its inferred type', async () => {
    const { normalized: allContracts } = await generate(
      {
        'src/api/article/controllers/article.ts':
          'export type ControllerContract = { find(): number };\nexport default () => ({ find: () => 1 });',
      },
      ['api::article.article']
    );
    const { normalized: allJS } = await generate({ 'src/api/article/controllers/legacy.js': '' }, [
      'api::article.legacy',
    ]);

    // `noUnusedLocals` would report a helper that no entry reads
    expect(allContracts).toContain('type ControllerContractOf<');
    expect(allContracts).not.toContain('ControllerInstance');
    expect(allJS).not.toContain('ControllerInstance');
    expect(allJS).not.toContain('ControllerContractOf');
  });

  test('resolves a contract lookup to the contract, and a contract typed any to unknown', async () => {
    const { root, strapi, pwd } = await createApp(
      {
        'src/api/article/controllers/article.ts':
          'export type ControllerContract = { find(): Promise<number> };\nexport default () => ({ find: async () => 1, extra: () => 2 });',
        'src/api/article/controllers/untyped.ts':
          'export type ControllerContract = any;\nexport default { find: () => 1 };',
      },
      ['api::article.article', 'api::article.untyped']
    );
    roots.push(root);

    const { output } = await generateControllersDefinitions({
      strapi,
      pwd,
      logger: createLogger({ silent: true }),
    });
    await outputFile(path.join(pwd, 'controllers.ts'), output);
    await outputFile(
      path.join(root, 'src/check.ts'),
      [
        // `any` passes any conditional type, such as an `Equal` assert: only assignability tells it
        // from `unknown`.
        "declare const article: Strapi.Registries.AppControllers['api::article.article'];",
        "declare const untyped: Strapi.Registries.AppControllers['api::article.untyped'];",
        'article.find() satisfies Promise<number>;',
        '// @ts-expect-error The contract has no other member, even one the factory returns.',
        'article.extra();',
        'untyped satisfies unknown;',
        '// @ts-expect-error A contract typed `any` registers `unknown`.',
        'untyped satisfies number;',
        'export {};',
      ].join('\n')
    );

    const program = ts.createProgram(
      [path.join(pwd, 'controllers.ts'), path.join(root, 'src/check.ts')],
      {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        types: [],
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.Node10,
      }
    );
    expect(
      ts
        .getPreEmitDiagnostics(program)
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    ).toEqual([]);
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

export {};
`);
    // An empty file must still be a module, so that `import type {} from './controllers'` compiles
    expect(
      ts.isExternalModule(ts.createSourceFile('controllers.ts', output, ts.ScriptTarget.Latest))
    ).toBe(true);
  });

  test('emits a placeholder when no api controller has a source file', async () => {
    const { output } = await generate(
      { 'src/api/article/content-types/article/schema.json': '{}' },
      ['api::article.article']
    );

    expect(output).toContain("The app doesn't have any controllers yet.");
  });
});
