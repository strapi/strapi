import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import * as ts from 'typescript';

import { generatePoliciesDefinitions } from '../../../generators/policies';
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

const createApp = async (files: Record<string, string>, policies: string[]) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'strapi-typegen-policies-'));

  for (const [file, content] of Object.entries(files)) {
    await outputFile(path.join(root, file), content);
  }

  const strapi = {
    dirs: {
      app: { api: path.join(root, 'src', 'api'), policies: path.join(root, 'src', 'policies') },
    },
    policies: Object.fromEntries(policies.map((uid) => [uid, () => true])),
  };

  return { root, strapi, pwd: path.join(root, 'types', 'generated') };
};

describe('generatePoliciesDefinitions', () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  const generate = async (files: Record<string, string>, policies: string[]) => {
    const { root, strapi, pwd } = await createApp(files, policies);
    roots.push(root);

    const logger = createLogger({ silent: true });
    const { output } = await generatePoliciesDefinitions({ strapi, pwd, logger });

    return { output, normalized: normalize(output), logger };
  };

  test('registers global and api policies in the global AppPolicies registry', async () => {
    const { normalized } = await generate(
      {
        'src/policies/isOwner.ts': '',
        'src/api/article/policies/hasRole.ts': '',
        'src/api/blog-post/policies/is-author.js': '',
      },
      ['global::isOwner', 'api::article.has-role', 'api::blog-post.is-author']
    );

    // The file must be a module for the global augmentation to be allowed
    expect(normalized).toContain('export {}');
    expect(normalized).toContain(
      'declare global { namespace Strapi { namespace Registries { interface AppPolicies {'
    );
    // Registries are global: no module augmentation of @strapi/strapi is involved
    expect(normalized).not.toContain('declare module');

    // Global policy names are not normalized by the loader, api policy names are kebab-cased
    expect(normalized).toContain(
      "'global::isOwner': PolicyConfig<typeof import('../../src/policies/isOwner')>"
    );
    expect(normalized).toContain(
      "'api::article.has-role': PolicyConfig<typeof import('../../src/api/article/policies/hasRole')>"
    );
    // The import of a JS policy does not resolve without `allowJs`
    expect(normalized).toContain("'api::blog-post.is-author': unknown");
    expect(normalized).not.toContain('policies/is-author');
  });

  test('resolves the config from the handler of both runtime forms', async () => {
    const { normalized } = await generate({ 'src/policies/isOwner.ts': '' }, ['global::isOwner']);

    // A bare handler, or the handler of `{ handler, validator }`
    expect(normalized).toContain(
      'type PolicyConfig<TModule> = TModule extends { default: infer TExport } ? PolicyHandlerConfig<TExport extends { handler: infer THandler } ? THandler : TExport> : unknown'
    );
    // Second parameter; `undefined` without one, `unknown` when untyped
    expect(normalized).toContain(
      "type PolicyHandlerConfig<THandler> = THandler extends (...args: infer TArgs) => unknown ? TArgs['length'] extends 0 | 1 ? undefined : 0 extends 1 & TArgs[1] ? unknown : TArgs[1] : unknown"
    );
  });

  test('registers the config type of both runtime forms', async () => {
    const { root, strapi, pwd } = await createApp(
      {
        'src/policies/bare.ts':
          'export default (ctx: unknown, config: { role: string }, opts: unknown) => true;',
        'src/policies/withValidator.ts':
          'export default { name: "x", validator: () => true, handler: (ctx: unknown, config: { max: number }) => true };',
        'src/policies/noConfig.ts': 'export default (ctx: unknown) => true;',
        'src/policies/optionalConfig.ts':
          'export default (ctx: unknown, config?: { soft: boolean }) => true;',
        'src/policies/untyped.ts': 'export default (ctx: any, config: any) => true;',
        'src/policies/noDefault.ts': 'export const helper = 1;',
        // Without `allowJs`, the import of a JS policy would not resolve
        'src/policies/legacy.js': 'module.exports = (ctx, config) => true;',
      },
      [
        'global::bare',
        'global::withValidator',
        'global::noConfig',
        'global::optionalConfig',
        'global::untyped',
        'global::noDefault',
        'global::legacy',
      ]
    );
    roots.push(root);

    const logger = createLogger({ silent: true });
    const { output } = await generatePoliciesDefinitions({ strapi, pwd, logger });
    await outputFile(path.join(pwd, 'policies.d.ts'), output);
    // A global stub for the registry namespace that @strapi/types declares
    await outputFile(
      path.join(root, 'registries.d.ts'),
      'declare namespace Strapi { namespace Registries { interface AppPolicies {} } }'
    );
    await outputFile(
      path.join(root, 'check.ts'),
      'export declare const registry: Strapi.Registries.AppPolicies;'
    );

    const program = ts.createProgram({
      rootNames: ['registries.d.ts', 'types/generated/policies.d.ts', 'check.ts'].map((file) =>
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
      'global::bare': '{ role: string; }',
      'global::withValidator': '{ max: number; }',
      'global::noConfig': 'undefined',
      'global::optionalConfig': '{ soft: boolean; } | undefined',
      'global::untyped': 'unknown',
      'global::noDefault': 'unknown',
      'global::legacy': 'unknown',
    });
  });

  test('only emits policies registered at runtime', async () => {
    const { output } = await generate(
      {
        'src/policies/isOwner.ts': '',
        'src/policies/excluded.ts': '',
        'src/api/article/policies/hasRole.ts': '',
        'src/api/draft/policies/draft.ts': '',
      },
      [
        'global::isOwner',
        'api::article.has-role',
        'admin::isAuthenticatedAdmin',
        'plugin::content-manager.hasPermissions',
      ]
    );

    expect(output).toContain("'global::isOwner'");
    expect(output).toContain("'api::article.has-role'");
    expect(output).not.toContain('excluded');
    expect(output).not.toContain('draft');
    expect(output).not.toContain('plugin::');
    expect(output).not.toContain('admin::');
  });

  test('ignores api controllers and middlewares, and policies of hidden api directories', async () => {
    const { output } = await generate(
      {
        'src/api/article/controllers/article.ts': '',
        'src/api/article/middlewares/article.ts': '',
        'src/api/.hidden/policies/hidden.ts': '',
      },
      ['api::article.article', 'api::hidden.hidden']
    );

    expect(output).toContain("The app doesn't have any policies yet.");
  });

  test('ignores declaration files and non source files', async () => {
    const { output } = await generate(
      {
        'src/policies/isOwner.ts': '',
        'src/policies/isOwner.d.ts': '',
        'src/policies/README.md': '',
        'src/api/article/policies/hasRole.ts': '',
        'src/api/article/policies/config.json': '{}',
      },
      ['global::isOwner', 'global::README', 'api::article.has-role', 'api::article.config']
    );

    expect(output.match(/'global::isOwner'/g)).toHaveLength(1);
    expect(output).not.toContain('README');
    expect(output).not.toContain('config.json');
    expect(output).not.toContain("'api::article.config'");
  });

  test('prefers the TypeScript source when several files resolve to the same uid', async () => {
    const { output, logger } = await generate(
      {
        'src/policies/isOwner.js': '',
        'src/policies/isOwner.ts': '',
        'src/api/article/policies/has-role.js': '',
        'src/api/article/policies/hasRole.ts': '',
      },
      ['global::isOwner', 'api::article.has-role']
    );

    expect(output).toContain("typeof import('../../src/policies/isOwner')");
    expect(output.match(/'global::isOwner'/g)).toHaveLength(1);
    expect(output).toContain("typeof import('../../src/api/article/policies/hasRole')");
    expect(output.match(/'api::article\.has-role'/g)).toHaveLength(1);
    expect(logger.warnings).toBe(2);
  });

  test('sorts the entries by uid', async () => {
    const { output } = await generate(
      {
        'src/policies/zebra.ts': '',
        'src/api/article/policies/article.ts': '',
      },
      ['global::zebra', 'api::article.article']
    );

    expect(output.indexOf("'api::article.article'")).toBeLessThan(
      output.indexOf("'global::zebra'")
    );
  });

  test('emits a placeholder when the app has no policies', async () => {
    const { output } = await generate({}, ['admin::isAuthenticatedAdmin']);

    expect(output).toBe(`/*
 * The app doesn't have any policies yet.
 */
`);
  });
});
