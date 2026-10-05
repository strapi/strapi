import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import * as ts from 'typescript';

import { generateMiddlewaresDefinitions } from '../../../generators/middlewares';
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

const createApp = async (files: Record<string, string>, middlewares: string[]) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'strapi-typegen-middlewares-'));

  for (const [file, content] of Object.entries(files)) {
    await outputFile(path.join(root, file), content);
  }

  const strapi = {
    dirs: {
      app: {
        api: path.join(root, 'src', 'api'),
        middlewares: path.join(root, 'src', 'middlewares'),
      },
    },
    middlewares: Object.fromEntries(middlewares.map((uid) => [uid, () => undefined])),
  };

  return { root, strapi, pwd: path.join(root, 'types', 'generated') };
};

describe('generateMiddlewaresDefinitions', () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  const generate = async (files: Record<string, string>, middlewares: string[]) => {
    const { root, strapi, pwd } = await createApp(files, middlewares);
    roots.push(root);

    const logger = createLogger({ silent: true });
    const { output } = await generateMiddlewaresDefinitions({ strapi, pwd, logger });

    return { output, normalized: normalize(output), logger };
  };

  test('registers global and api middlewares in the global AppMiddlewares registry', async () => {
    const { normalized } = await generate(
      {
        'src/middlewares/rateLimit.ts': '',
        'src/api/article/middlewares/auditLog.ts': '',
        'src/api/blog-post/middlewares/is-author.js': '',
      },
      ['global::rateLimit', 'api::article.audit-log', 'api::blog-post.is-author']
    );

    // The file must be a module for the global augmentation to be allowed
    expect(normalized).toContain('export {}');
    expect(normalized).toContain(
      'declare global { namespace Strapi { namespace Registries { interface AppMiddlewares {'
    );
    // Registries are global: no module augmentation of @strapi/strapi is involved
    expect(normalized).not.toContain('declare module');

    // Global middleware names are not normalized by the loader, api middleware names are kebab-cased
    expect(normalized).toContain(
      "'global::rateLimit': MiddlewareConfig<typeof import('../../src/middlewares/rateLimit')>"
    );
    expect(normalized).toContain(
      "'api::article.audit-log': MiddlewareConfig<typeof import('../../src/api/article/middlewares/auditLog')>"
    );
    // The import of a JS middleware does not resolve without `allowJs`
    expect(normalized).toContain("'api::blog-post.is-author': unknown");
    expect(normalized).not.toContain('middlewares/is-author');
  });

  test('resolves the config from the first parameter of the exported factory', async () => {
    const { normalized } = await generate({ 'src/middlewares/rateLimit.ts': '' }, [
      'global::rateLimit',
    ]);

    expect(normalized).toContain(
      'type MiddlewareConfig<TModule> = TModule extends { default: infer TExport } ? MiddlewareFactoryConfig<TExport> : unknown'
    );
    // First parameter; `undefined` without one, `unknown` when untyped
    expect(normalized).toContain(
      "type MiddlewareFactoryConfig<TFactory> = TFactory extends (...args: infer TArgs) => unknown ? TArgs['length'] extends 0 ? undefined : 0 extends 1 & TArgs[0] ? unknown : TArgs[0] : unknown"
    );
  });

  test('registers the config type of each factory form', async () => {
    const { root, strapi, pwd } = await createApp(
      {
        'src/middlewares/typed.ts':
          'export default (config: { max: number }, ctx: { strapi: unknown }) => undefined;',
        'src/middlewares/noConfig.ts': 'export default () => undefined;',
        'src/middlewares/optionalConfig.ts':
          'export default (config?: { soft: boolean }) => undefined;',
        'src/middlewares/untyped.ts': 'export default (config: any) => undefined;',
        'src/middlewares/noDefault.ts': 'export const helper = 1;',
        // Without `allowJs`, the import of a JS middleware would not resolve
        'src/middlewares/legacy.js': 'module.exports = (config, { strapi }) => undefined;',
        'src/api/article/middlewares/auditLog.ts':
          'export default (config: { level: "info" | "warn" }) => undefined;',
      },
      [
        'global::typed',
        'global::noConfig',
        'global::optionalConfig',
        'global::untyped',
        'global::noDefault',
        'global::legacy',
        'api::article.audit-log',
      ]
    );
    roots.push(root);

    const logger = createLogger({ silent: true });
    const { output } = await generateMiddlewaresDefinitions({ strapi, pwd, logger });
    await outputFile(path.join(pwd, 'middlewares.d.ts'), output);
    // A global stub for the registry namespace that @strapi/types declares
    await outputFile(
      path.join(root, 'registries.d.ts'),
      'declare namespace Strapi { namespace Registries { interface AppMiddlewares {} } }'
    );
    await outputFile(
      path.join(root, 'check.ts'),
      'export declare const registry: Strapi.Registries.AppMiddlewares;'
    );

    const program = ts.createProgram({
      rootNames: ['registries.d.ts', 'types/generated/middlewares.d.ts', 'check.ts'].map((file) =>
        path.join(root, file)
      ),
      options: { noEmit: true, strict: true, types: [] },
    });
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    expect(diagnostics).toEqual([]);

    // Printed rather than checked with conditional types, which an error type would satisfy
    const checker = program.getTypeChecker();
    const check = program.getSourceFile(path.join(root, 'check.ts'))!;
    const [declaration] = (check.statements[0] as ts.VariableStatement).declarationList
      .declarations;
    const registry = checker.getTypeAtLocation(declaration.name);
    const configs = Object.fromEntries(
      checker
        .getPropertiesOfType(registry)
        .map((property) => [
          property.name,
          checker.typeToString(checker.getTypeOfSymbolAtLocation(property, check)),
        ])
    );

    expect(configs).toEqual({
      'api::article.audit-log': '{ level: "info" | "warn"; }',
      'global::typed': '{ max: number; }',
      'global::noConfig': 'undefined',
      'global::optionalConfig': '{ soft: boolean; } | undefined',
      'global::untyped': 'unknown',
      'global::noDefault': 'unknown',
      'global::legacy': 'unknown',
    });
  });

  test('only emits middlewares registered at runtime', async () => {
    const { output } = await generate(
      {
        'src/middlewares/rateLimit.ts': '',
        'src/middlewares/excluded.ts': '',
        'src/api/article/middlewares/auditLog.ts': '',
        'src/api/draft/middlewares/draft.ts': '',
      },
      [
        'global::rateLimit',
        'api::article.audit-log',
        'strapi::cors',
        'admin::rateLimit',
        'plugin::email.rateLimit',
      ]
    );

    expect(output).toContain("'global::rateLimit'");
    expect(output).toContain("'api::article.audit-log'");
    expect(output).not.toContain('excluded');
    expect(output).not.toContain('draft');
    expect(output).not.toContain('strapi::');
    expect(output).not.toContain('plugin::');
    expect(output).not.toContain('admin::');
  });

  test('ignores api controllers and policies, and middlewares of hidden api directories', async () => {
    const { output } = await generate(
      {
        'src/api/article/controllers/article.ts': '',
        'src/api/article/policies/article.ts': '',
        'src/api/.hidden/middlewares/hidden.ts': '',
      },
      ['api::article.article', 'api::hidden.hidden']
    );

    expect(output).toContain("The app doesn't have any middlewares yet.");
  });

  test('ignores declaration files and non source files', async () => {
    const { output } = await generate(
      {
        'src/middlewares/rateLimit.ts': '',
        'src/middlewares/rateLimit.d.ts': '',
        'src/middlewares/README.md': '',
        'src/api/article/middlewares/auditLog.ts': '',
        'src/api/article/middlewares/config.json': '{}',
      },
      ['global::rateLimit', 'global::README', 'api::article.audit-log', 'api::article.config']
    );

    expect(output.match(/'global::rateLimit'/g)).toHaveLength(1);
    expect(output).not.toContain('README');
    expect(output).not.toContain('config.json');
    expect(output).not.toContain("'api::article.config'");
  });

  test('prefers the TypeScript source when several files resolve to the same uid', async () => {
    const { output, logger } = await generate(
      {
        'src/middlewares/rateLimit.js': '',
        'src/middlewares/rateLimit.ts': '',
        'src/api/article/middlewares/audit-log.js': '',
        'src/api/article/middlewares/auditLog.ts': '',
      },
      ['global::rateLimit', 'api::article.audit-log']
    );

    expect(output).toContain("typeof import('../../src/middlewares/rateLimit')");
    expect(output.match(/'global::rateLimit'/g)).toHaveLength(1);
    expect(output).toContain("typeof import('../../src/api/article/middlewares/auditLog')");
    expect(output.match(/'api::article\.audit-log'/g)).toHaveLength(1);
    expect(logger.warnings).toBe(2);
  });

  test('sorts the entries by uid', async () => {
    const { output } = await generate(
      {
        'src/middlewares/zebra.ts': '',
        'src/api/article/middlewares/article.ts': '',
      },
      ['global::zebra', 'api::article.article']
    );

    expect(output.indexOf("'api::article.article'")).toBeLessThan(
      output.indexOf("'global::zebra'")
    );
  });

  test('emits a placeholder when the app has no middlewares', async () => {
    const { output } = await generate({}, ['strapi::cors', 'admin::rateLimit']);

    expect(output).toBe(`/*
 * The app doesn't have any middlewares yet.
 */
`);
  });
});
