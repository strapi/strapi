import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import * as ts from 'typescript';

import { generateServicesDefinitions } from '../../../generators/services';
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
 * Type of the service instance exposed by a service module: the return type of its default
 * export when it is a factory, the default export itself otherwise.
 */
type ServiceInstance<TModule> = TModule extends {
    default: infer TExport;
} ? 0 extends 1 & TExport ? unknown : TExport extends (...args: any[]) => infer TInstance ? TInstance : TExport : unknown;

declare global {
    namespace Strapi {
        namespace Registries {
            interface AppServices {
                'api::article.article': ServiceInstance<typeof import('../../src/api/article/services/article.js')>;
                'api::article.legacy': unknown;
            }
            interface InferredServices {
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

const createApp = async (files: Record<string, string>, services: string[]) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'strapi-typegen-services-'));

  for (const [file, content] of Object.entries(files)) {
    await outputFile(path.join(root, file), content);
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
    await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  const generate = async (files: Record<string, string>, services: string[]) => {
    const { root, strapi, pwd } = await createApp(files, services);
    roots.push(root);

    const logger = createLogger({ silent: true });
    const { output } = await generateServicesDefinitions({ strapi, pwd, logger });

    return { output, normalized: normalize(output), logger };
  };

  test('rejects without the output directory that source imports are relative to', async () => {
    await expect(generateServicesDefinitions()).rejects.toThrow(
      'The services generator needs the output directory to resolve source imports'
    );
  });

  test('registers api services in the global AppServices registry', async () => {
    const { normalized } = await generate(
      {
        'src/api/article/services/article.ts': '',
        'src/api/article/services/randomArticleGenerator.ts': '',
        'src/api/category/services/category.ts': '',
      },
      ['api::article.article', 'api::article.random-article-generator', 'api::category.category']
    );

    // The file must be a module for the global augmentation to be allowed
    expect(normalized).toContain('export {}');
    expect(normalized).toContain(
      'declare global { namespace Strapi { namespace Registries { interface AppServices {'
    );
    // Registries are global: no module augmentation of @strapi/strapi is involved
    expect(normalized).not.toContain('declare module');

    expect(normalized).toContain(
      "'api::article.article': ServiceInstance<typeof import('../../src/api/article/services/article.js')>"
    );
    expect(normalized).toContain(
      "'api::article.random-article-generator': ServiceInstance<typeof import('../../src/api/article/services/randomArticleGenerator.js')>"
    );
    expect(normalized).toContain(
      "'api::category.category': ServiceInstance<typeof import('../../src/api/category/services/category.js')>"
    );
  });

  test('resolves the instance type from the default export, falling back to unknown', async () => {
    const { normalized } = await generate({ 'src/api/article/services/article.ts': '' }, [
      'api::article.article',
    ]);

    expect(normalized).toContain(
      'type ServiceInstance<TModule> = TModule extends { default: infer TExport } ? 0 extends 1 & TExport ? unknown : TExport extends (...args: any[]) => infer TInstance ? TInstance : TExport : unknown'
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

    expect(output.match(/'api::article\.article': ServiceInstance</g)).toHaveLength(1);
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

    expect(output).toContain("typeof import('../../src/api/article/services/article.js')");
    expect(output.match(/'api::article\.article': ServiceInstance</g)).toHaveLength(1);
    expect(logger.warnings).toBe(1);
  });

  test('registers a JS source as unknown, without importing it', async () => {
    const { normalized } = await generate(
      {
        'src/api/article/services/article.ts': '',
        'src/api/article/services/legacy.js': '',
      },
      ['api::article.article', 'api::article.legacy']
    );

    expect(normalized).toContain("'api::article.legacy': unknown");
    expect(normalized).not.toContain("legacy')");
  });

  test('resolves a module or a default export typed any to unknown', async () => {
    const { root, strapi, pwd } = await createApp(
      {
        'src/api/article/services/article.ts': 'export default () => ({ find: () => 1 });',
        'src/api/article/services/untyped.ts': 'declare const service: any;\nexport = service;',
        'src/api/article/services/anyDefault.ts':
          'declare const service: any;\nexport default service;',
        'src/api/article/services/removed.ts': 'export default {};',
      },
      [
        'api::article.article',
        'api::article.untyped',
        'api::article.any-default',
        'api::article.removed',
      ]
    );
    roots.push(root);

    const { output } = await generateServicesDefinitions({
      strapi,
      pwd,
      logger: createLogger({ silent: true }),
    });
    await outputFile(path.join(pwd, 'services.ts'), output);
    // The source moved after generation: the generated import no longer resolves.
    await fs.rm(path.join(root, 'src/api/article/services/removed.ts'));
    await outputFile(
      path.join(root, 'src/check.ts'),
      [
        // `any` and an unresolved import pass any conditional type, such as an `Equal` assert: only
        // assignability tells them from `unknown`.
        'type Service<TUID extends keyof Strapi.Registries.AppServices> = Strapi.Registries.AppServices[TUID];',
        "declare const article: Service<'api::article.article'>;",
        "declare const untyped: Service<'api::article.untyped'>;",
        "declare const anyDefault: Service<'api::article.any-default'>;",
        'article.find() satisfies number;',
        '// @ts-expect-error The inferred service has no other member.',
        'article.missing();',
        '// @ts-expect-error A module typed `any` registers `unknown`.',
        'untyped satisfies number;',
        '// @ts-expect-error A default export typed `any` registers `unknown`.',
        'anyDefault satisfies number;',
        'export {};',
      ].join('\n')
    );

    const check = (skipLibCheck: boolean) =>
      ts
        .getPreEmitDiagnostics(
          ts.createProgram([path.join(pwd, 'services.ts'), path.join(root, 'src/check.ts')], {
            noEmit: true,
            strict: true,
            skipLibCheck,
            types: [],
            module: ts.ModuleKind.CommonJS,
            moduleResolution: ts.ModuleResolutionKind.Node10,
          })
        )
        .map(
          (diagnostic) => `${path.basename(diagnostic.file?.fileName ?? '')} TS${diagnostic.code}`
        );

    // The import that no longer resolves is an error type, which no conditional type maps to
    // `unknown`: the generated file reports it, and `skipLibCheck` does not apply to a `.ts` file.
    expect(check(true)).toEqual(['services.ts TS2307']);
    expect(check(false)).toEqual(['services.ts TS2307']);
  });

  test('marks the uids of an application without contracts, without a contract helper', async () => {
    const { output } = await generate(
      {
        'src/api/article/services/article.ts': 'export type ArticleContract = { find(): number };',
        'src/api/article/services/legacy.js': '',
      },
      ['api::article.article', 'api::article.legacy']
    );

    expect(output).toBe(NO_CONTRACT_OUTPUT);
  });

  test('registers the ServiceContract export of a service', async () => {
    const { normalized } = await generate(
      {
        'src/api/article/services/article.ts':
          'export type ServiceContract = { find(): Promise<number> };\nexport default () => ({ find: async () => 1 });',
        'src/api/article/services/inferred.ts': 'export default () => ({ find: () => 1 });',
        'src/api/article/services/legacy.js': '',
        'src/api/article/services/other.ts':
          'export type ControllerContract = { find(): number };\nexport default {};',
      },
      ['api::article.article', 'api::article.inferred', 'api::article.legacy', 'api::article.other']
    );

    expect(normalized).toContain(
      "'api::article.article': ServiceContractOf<import('../../src/api/article/services/article.js').ServiceContract>"
    );
    // Without a contract export, a service keeps the type it exports
    expect(normalized).toContain(
      "'api::article.inferred': ServiceInstance<typeof import('../../src/api/article/services/inferred.js')>"
    );
    expect(normalized).toContain("'api::article.legacy': unknown");
    // A controller contract is not read in a services file
    expect(normalized).toContain(
      "'api::article.other': ServiceInstance<typeof import('../../src/api/article/services/other.js')>"
    );
    expect(normalized).toContain(
      'type ServiceContractOf<TContract> = 0 extends 1 & TContract ? unknown : TContract'
    );
    expect(normalized.match(/type ServiceContractOf</g)).toHaveLength(1);
    // Only the TypeScript services without a contract export are marked as inferred
    expect(normalized).toContain(
      "interface InferredServices { 'api::article.inferred': true 'api::article.other': true }"
    );
  });

  test('emits no inferred marker when every source exports a contract or is JS', async () => {
    const { normalized } = await generate(
      {
        'src/api/article/services/article.ts':
          'export type ServiceContract = { find(): number };\nexport default () => ({ find: () => 1 });',
        'src/api/article/services/legacy.js': '',
      },
      ['api::article.article', 'api::article.legacy']
    );

    expect(normalized).toContain("'api::article.article': ServiceContractOf<");
    expect(normalized).not.toContain('InferredServices');
  });

  test('resolves a contract lookup to the contract, and a contract typed any to unknown', async () => {
    const { root, strapi, pwd } = await createApp(
      {
        'src/api/article/services/article.ts':
          'export type ServiceContract = { find(): Promise<number> };\nexport default () => ({ find: async () => 1, extra: () => 2 });',
        'src/api/article/services/untyped.ts':
          'export type ServiceContract = any;\nexport default { find: () => 1 };',
        'src/api/article/services/renamed.ts':
          'export type ServiceContract = { find(): number };\nexport default { find: () => 1 };',
      },
      ['api::article.article', 'api::article.untyped', 'api::article.renamed']
    );
    roots.push(root);

    const { output } = await generateServicesDefinitions({
      strapi,
      pwd,
      logger: createLogger({ silent: true }),
    });
    await outputFile(path.join(pwd, 'services.ts'), output);
    // The export was renamed after generation: the generated reference no longer resolves.
    await outputFile(
      path.join(root, 'src/api/article/services/renamed.ts'),
      'export type Contract = { find(): number };\nexport default { find: () => 1 };'
    );
    await outputFile(
      path.join(root, 'src/check.ts'),
      [
        // An unresolved reference or `any` passes any conditional type, such as an `Equal` assert:
        // only assignability tells them from `unknown`.
        "declare const article: Strapi.Registries.AppServices['api::article.article'];",
        "declare const untyped: Strapi.Registries.AppServices['api::article.untyped'];",
        'article.find() satisfies Promise<number>;',
        '// @ts-expect-error The contract has no other member, even one the factory returns.',
        'article.extra();',
        'untyped satisfies unknown;',
        '// @ts-expect-error A contract typed `any` registers `unknown`.',
        'untyped satisfies number;',
        'export {};',
      ].join('\n')
    );

    const check = (skipLibCheck: boolean) =>
      ts
        .getPreEmitDiagnostics(
          ts.createProgram([path.join(pwd, 'services.ts'), path.join(root, 'src/check.ts')], {
            noEmit: true,
            strict: true,
            skipLibCheck,
            types: [],
            module: ts.ModuleKind.CommonJS,
            moduleResolution: ts.ModuleResolutionKind.Node10,
          })
        )
        .map(
          (diagnostic) => `${path.basename(diagnostic.file?.fileName ?? '')} TS${diagnostic.code}`
        );

    // The stale reference is an error type that no conditional type maps to `unknown`: the generated
    // file reports it until the next generation, and `skipLibCheck` does not apply to a `.ts` file.
    expect(check(true)).toEqual(['services.ts TS2694']);
    expect(check(false)).toEqual(['services.ts TS2694']);
  });

  test('emits the instance helper only when a source registers its inferred type', async () => {
    const { normalized: allContracts } = await generate(
      {
        'src/api/article/services/article.ts':
          'export type ServiceContract = { find(): number };\nexport default () => ({ find: () => 1 });',
      },
      ['api::article.article']
    );
    const { normalized: allJS } = await generate({ 'src/api/article/services/legacy.js': '' }, [
      'api::article.legacy',
    ]);

    expect(allContracts).toContain('type ServiceContractOf<');
    expect(allContracts).not.toContain('ServiceInstance');
    expect(allJS).not.toContain('ServiceInstance');
    expect(allJS).not.toContain('ServiceContractOf');
  });

  test.each([
    [
      'every source exports a contract',
      {
        'src/api/article/services/article.ts':
          'export type ServiceContract = { find(): number };\nexport default () => ({ find: () => 1 });',
      },
      ['api::article.article'],
    ],
    ['every source is JS', { 'src/api/article/services/legacy.js': '' }, ['api::article.legacy']],
    [
      'every source is inferred',
      { 'src/api/article/services/article.ts': 'export default () => ({ find: () => 1 });' },
      ['api::article.article'],
    ],
  ])('compiles under noUnusedLocals when %s', async (_, files, services) => {
    const { root, strapi, pwd } = await createApp(files, services);
    roots.push(root);

    const { output } = await generateServicesDefinitions({
      strapi,
      pwd,
      logger: createLogger({ silent: true }),
    });
    await outputFile(path.join(pwd, 'services.ts'), output);

    const diagnostics = ts
      .getPreEmitDiagnostics(
        ts.createProgram([path.join(pwd, 'services.ts')], {
          noEmit: true,
          strict: true,
          noUnusedLocals: true,
          types: [],
          module: ts.ModuleKind.CommonJS,
          moduleResolution: ts.ModuleResolutionKind.Node10,
        })
      )
      .map(
        (diagnostic) => `${path.basename(diagnostic.file?.fileName ?? '')} TS${diagnostic.code}`
      );

    expect(diagnostics).toEqual([]);
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

export {};
`);
    // An empty file must still be a module, so that `import type {} from './services'` compiles
    expect(
      ts.isExternalModule(ts.createSourceFile('services.ts', output, ts.ScriptTarget.Latest))
    ).toBe(true);
  });

  test('emits a placeholder when no api service has a source file', async () => {
    const { output } = await generate(
      { 'src/api/article/content-types/article/schema.json': '{}' },
      ['api::article.article']
    );

    expect(output).toContain("The app doesn't have any services yet.");
  });
});
