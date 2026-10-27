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

  test('rejects without the output directory that source imports are relative to', async () => {
    await expect(generateMiddlewaresDefinitions()).rejects.toThrow(
      'The middlewares generator needs the output directory to resolve source imports'
    );
  });

  test('registers global and api middlewares in the global AppMiddlewares registry', async () => {
    const { normalized } = await generate(
      {
        'src/middlewares/rateLimit.ts': 'export default {};',
        'src/api/article/middlewares/auditLog.ts': 'export default {};',
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
      "'global::rateLimit': MiddlewareConfig<typeof import('../../src/middlewares/rateLimit.js')>"
    );
    expect(normalized).toContain(
      "'api::article.audit-log': MiddlewareConfig<typeof import('../../src/api/article/middlewares/auditLog.js')>"
    );
    // The import of a JS middleware does not resolve without `allowJs`
    expect(normalized).toContain("'api::blog-post.is-author': unknown");
    expect(normalized).not.toContain('middlewares/is-author');
  });

  test('resolves the config from the first parameter of the exported factory', async () => {
    const { normalized } = await generate(
      { 'src/middlewares/rateLimit.ts': 'export default {};' },
      ['global::rateLimit']
    );

    expect(normalized).toContain(
      'type MiddlewareConfig<TModule> = TModule extends { default: infer TExport } ? MiddlewareFactoryConfig<TExport> : unknown'
    );
    // First parameter; `undefined` without one, `unknown` when untyped, `never` when not a factory
    expect(normalized).toContain(
      "type MiddlewareFactoryConfig<TFactory> = TFactory extends (...args: infer TArgs) => unknown ? TFactory extends (config: never, ctx: { strapi: never }) => unknown ? TArgs['length'] extends 0 ? undefined : 0 extends 1 & TArgs[0] ? unknown : TArgs[0] extends { request: unknown response: unknown app: unknown } ? never : TArgs[0] : never : unknown"
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
        // No default export: registers `undefined` at runtime, left out
        'src/middlewares/noDefault.ts': 'export const helper = 1;',
        'src/middlewares/typeOnly.ts': 'export type Config = { max: number };',
        'src/middlewares/starOnly.ts': "export * from './typed';",
        'src/middlewares/reexportDefault.ts': "export { default } from './typed';",
        'src/middlewares/strapiContext.ts':
          'export default (config: { a: 1 }, { strapi }: { strapi: { log: (message: string) => void } }) => undefined;',
        // Runtime calls a default export as a factory: a plain Koa handler breaks
        'src/middlewares/koaHandler.ts':
          'export default (ctx: { path: string }, next: () => void) => next();',
        // A handler that takes `{ strapi }` as `next`: its first parameter is a Koa context
        'src/middlewares/ctxHandler.ts':
          'export default (ctx: { request: object; response: object; app: object; path: string }) => undefined;',
        'src/middlewares/untypedNext.ts':
          'export default (ctx: { request: object; response: object; app: object }, next: any) => next();',
        // `any` matches a context too: it stays an untyped config
        'src/middlewares/anyContext.ts': 'export default (ctx: any) => undefined;',
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
        'global::typeOnly',
        'global::starOnly',
        'global::reexportDefault',
        'global::strapiContext',
        'global::koaHandler',
        'global::ctxHandler',
        'global::untypedNext',
        'global::anyContext',
        'global::legacy',
        'api::article.audit-log',
      ]
    );
    roots.push(root);

    const logger = createLogger({ silent: true });
    const { output } = await generateMiddlewaresDefinitions({ strapi, pwd, logger });
    await outputFile(path.join(pwd, 'middlewares.ts'), output);
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
      rootNames: ['registries.d.ts', 'types/generated/middlewares.ts', 'check.ts'].map((file) =>
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
      'global::reexportDefault': '{ max: number; }',
      'global::strapiContext': '{ a: 1; }',
      'global::koaHandler': 'never',
      'global::ctxHandler': 'never',
      'global::untypedNext': 'never',
      'global::anyContext': 'unknown',
      'global::legacy': 'unknown',
    });
    // One per module without a default export
    expect(logger.warnings).toBe(3);
  });

  test('registers the value of an export = module, and a CommonJS-style source as unknown', async () => {
    const { root, strapi, pwd } = await createApp(
      {
        'src/middlewares/assigned.ts':
          'const middleware = (config: { max: number }) => undefined;\nexport = middleware;',
        // The import of a file without ECMAScript module syntax fails with TS2306
        'src/middlewares/commonjs.ts': 'module.exports = (config: { max: number }) => undefined;',
      },
      ['global::assigned', 'global::commonjs']
    );
    roots.push(root);

    const { output } = await generateMiddlewaresDefinitions({
      strapi,
      pwd,
      logger: createLogger({ silent: true }),
    });

    // `importDefault` wraps the assigned value, as `default`
    expect(normalize(output)).toContain(
      "'global::assigned': MiddlewareConfig<{ default: typeof import('../../src/middlewares/assigned.js') }>"
    );
    expect(normalize(output)).toContain("'global::commonjs': unknown");
    expect(output).not.toContain('src/middlewares/commonjs');

    await outputFile(path.join(pwd, 'middlewares.ts'), output);
    await outputFile(
      path.join(root, 'check.ts'),
      'export declare const registry: Strapi.Registries.AppMiddlewares;'
    );

    // The template's compiler options (packages/cli/create-strapi-app/templates/vanilla/tsconfig.json)
    const program = ts.createProgram({
      rootNames: [path.join(pwd, 'middlewares.ts'), path.join(root, 'check.ts')],
      options: {
        noEmit: true,
        strict: true,
        noUnusedLocals: true,
        esModuleInterop: true,
        types: [],
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.Node10,
      },
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
    const values = Object.fromEntries(
      checker
        .getPropertiesOfType(registry)
        .map((property) => [
          property.name,
          checker.typeToString(checker.getTypeOfSymbolAtLocation(property, check)),
        ])
    );

    expect(values).toEqual({
      'global::assigned': '{ max: number; }',
      'global::commonjs': 'unknown',
    });
  });

  test('emits no helper when every TypeScript source is CommonJS-style', async () => {
    const { output } = await generate(
      { 'src/middlewares/commonjs.ts': 'module.exports = (config: { max: number }) => undefined;' },
      ['global::commonjs']
    );

    expect(normalize(output)).toContain("'global::commonjs': unknown");
    // `noUnusedLocals` would report a helper that no entry reads
    expect(output).not.toContain('MiddlewareConfig');
  });

  test('leaves out a module without a default export, with one warning naming the file', async () => {
    const { root, strapi, pwd } = await createApp(
      {
        'src/middlewares/rateLimit.ts': 'export default (config: { max: number }) => undefined;',
        'src/middlewares/helpers.ts': 'export const helper = 1;',
        // Not registered at runtime: left out before, without a warning
        'src/middlewares/unregistered.ts': 'export const helper = 1;',
      },
      ['global::rateLimit', 'global::helpers']
    );
    roots.push(root);

    const logger = createLogger({ silent: true });
    const warn = jest.spyOn(logger, 'warn');
    const { output } = await generateMiddlewaresDefinitions({ strapi, pwd, logger });

    expect(output).toContain("'global::rateLimit'");
    expect(output).not.toContain('helpers');
    expect(output).not.toContain('unregistered');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      `Skipped global::helpers in the generated middlewares types: ${path.join(root, 'src', 'middlewares', 'helpers.ts')} has no default export, so Strapi registers nothing under global::helpers and a route that references it fails at startup. Export the middleware with \`export default\`, or move the file out of the middlewares directory if it is not a middleware.`
    );
  });

  test('emits a placeholder when the only middleware has no default export', async () => {
    const { output, logger } = await generate(
      { 'src/middlewares/helpers.ts': 'export const helper = 1;' },
      ['global::helpers']
    );

    expect(output).toContain("The app doesn't have any middlewares yet.");
    expect(logger.warnings).toBe(1);
  });

  test('only emits middlewares registered at runtime', async () => {
    const { output } = await generate(
      {
        'src/middlewares/rateLimit.ts': 'export default {};',
        'src/middlewares/excluded.ts': 'export default {};',
        'src/api/article/middlewares/auditLog.ts': 'export default {};',
        'src/api/draft/middlewares/draft.ts': 'export default {};',
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
        'src/api/article/controllers/article.ts': 'export default {};',
        'src/api/article/policies/article.ts': 'export default {};',
        'src/api/.hidden/middlewares/hidden.ts': 'export default {};',
      },
      ['api::article.article', 'api::hidden.hidden']
    );

    expect(output).toContain("The app doesn't have any middlewares yet.");
  });

  test('ignores declaration files and non source files', async () => {
    const { output } = await generate(
      {
        'src/middlewares/rateLimit.ts': 'export default {};',
        'src/middlewares/rateLimit.d.ts': '',
        'src/middlewares/README.md': '',
        'src/api/article/middlewares/auditLog.ts': 'export default {};',
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
        'src/middlewares/rateLimit.ts': 'export default {};',
        'src/api/article/middlewares/audit-log.js': '',
        'src/api/article/middlewares/auditLog.ts': 'export default {};',
      },
      ['global::rateLimit', 'api::article.audit-log']
    );

    expect(output).toContain("typeof import('../../src/middlewares/rateLimit.js')");
    expect(output.match(/'global::rateLimit'/g)).toHaveLength(1);
    expect(output).toContain("typeof import('../../src/api/article/middlewares/auditLog.js')");
    expect(output.match(/'api::article\.audit-log'/g)).toHaveLength(1);
    expect(logger.warnings).toBe(2);
  });

  test('emits no config helpers when every source is JS', async () => {
    const { output } = await generate(
      { 'src/middlewares/legacy.js': 'module.exports = () => async (ctx, next) => next();' },
      ['global::legacy']
    );

    expect(output).toContain("'global::legacy': unknown");
    // `noUnusedLocals` would report a helper that no entry reads
    expect(output).not.toContain('MiddlewareConfig');
  });

  test('sorts the entries by uid', async () => {
    const { output } = await generate(
      {
        'src/middlewares/zebra.ts': 'export default {};',
        'src/api/article/middlewares/article.ts': 'export default {};',
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

export {};
`);
    // An empty file must still be a module, so that `import type {} from './middlewares'` compiles
    expect(
      ts.isExternalModule(ts.createSourceFile('middlewares.ts', output, ts.ScriptTarget.Latest))
    ).toBe(true);
  });
});
