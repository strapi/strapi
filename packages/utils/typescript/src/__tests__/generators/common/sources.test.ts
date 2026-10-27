import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { compareCodeUnits } from '../../../generators/common/compare';
import {
  filterRegisteredSources,
  findTypeExports,
  hasModuleType,
  scanSources,
  toImportSpecifier,
} from '../../../generators/common/sources';
import { createLogger } from '../../../generators/utils';

// Each pair orders one way by code units and the other way with localeCompare in common locales
const LOCALE_SENSITIVE_PAIRS = [
  ['Zeta', 'alpha'],
  ['a-b', 'a_b'],
];

describe('compareCodeUnits', () => {
  test.each(LOCALE_SENSITIVE_PAIRS)('orders %s before %s', (first, second) => {
    expect(compareCodeUnits(first, second)).toBe(-1);
    expect(compareCodeUnits(second, first)).toBe(1);
    expect([second, first].sort(compareCodeUnits)).toEqual([first, second]);
  });

  test('equal strings compare as 0', () => {
    expect(compareCodeUnits('global::cors', 'global::cors')).toBe(0);
  });
});

describe('toImportSpecifier', () => {
  const generated = path.join(path.sep, 'app', 'types', 'generated');

  // NodeNext requires the extension in ECMAScript modules; every module resolution maps it back
  test.each([
    ['src/api/article/services/article.ts', '../../src/api/article/services/article.js'],
    ['src/policies/legacy.js', '../../src/policies/legacy.js'],
    ['src/middlewares/timer.mts', '../../src/middlewares/timer.mjs'],
    ['src/middlewares/timer.cts', '../../src/middlewares/timer.cjs'],
  ])('imports %s as %s', (file, specifier) => {
    expect(toImportSpecifier(generated, path.join(path.sep, 'app', file))).toBe(specifier);
  });

  test('starts a path inside the generated directory with ./', () => {
    expect(toImportSpecifier(generated, path.join(generated, 'nested', 'source.ts'))).toBe(
      './nested/source.js'
    );
  });

  test('rejects a file that does not compile to JavaScript', () => {
    expect(() => toImportSpecifier(generated, path.join(path.sep, 'app', 'src', 'x.json'))).toThrow(
      'unsupported source extension'
    );
  });
});

describe('filterRegisteredSources', () => {
  test('sorts the sources by uid in code-unit order', () => {
    const uids = ['global::alpha', 'global::a_b', 'global::Zeta', 'global::a-b'];
    const sources = uids.map((uid) => ({ uid, file: `${uid}.ts`, specifier: `./${uid}` }));
    const registered = Object.fromEntries(uids.map((uid) => [uid, {}]));

    const sorted = filterRegisteredSources(sources, registered, createLogger({ silent: true }));

    expect(sorted.map((source) => source.uid)).toEqual([
      'global::Zeta',
      'global::a-b',
      'global::a_b',
      'global::alpha',
    ]);
  });
});

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

// One source per entry, named after its key: `<key>.ts`, or the key itself when it has an extension
const writeSources = async (files: Record<string, string | null>) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'strapi-typegen-sources-'));
  roots.push(root);

  return Promise.all(
    Object.entries(files).map(async ([key, content]) => {
      const file = path.join(root, path.extname(key) === '' ? `${key}.ts` : key);
      // `null` leaves the file out, so that reading it fails
      if (content !== null) {
        await fs.writeFile(file, content);
      }
      return { uid: `api::${key}.${key}`, file, specifier: `./${key}` };
    })
  );
};

describe('scanSources', () => {
  const scanIn = async (files: Record<string, string | null>) => {
    const logger = createLogger({ silent: true });

    return { scanned: await scanSources(await writeSources(files), logger), logger };
  };

  const shapesOf = async (files: Record<string, string | null>) => {
    const { scanned, logger } = await scanIn(files);

    return {
      shapes: Object.fromEntries(
        scanned.map((source) => [source.uid.split('.')[1], source.module?.shape])
      ),
      logger,
    };
  };

  test('reads the module shape of each TypeScript source', async () => {
    const { shapes, logger } = await shapesOf({
      expression: 'export default (config: unknown) => config;',
      fn: 'export default function factory() {}',
      klass: 'export default class Factory {}',
      abstractClass: 'export default abstract class Factory {}',
      renamed: 'const factory = () => 1;\nexport { factory as default };',
      reexportDefault: "export { default } from './typed';",
      namespaceDefault: "export * as default from './typed';",
      exportEquals: 'const factory = () => 1;\nexport = factory;',
      starOnly: "export * from './typed';",
      namedOnly: 'export const helper = 1;',
      typeOnly: 'export type Config = { max: number };',
      defaultInterface: 'export default interface Config { max: number }',
      typeSpecifier: 'type Config = { max: number };\nexport { type Config as default };',
      typeOnlyExport: 'type Config = { max: number };\nexport type { Config as default };',
      importOnly: "import './side-effect';",
      commonjs: 'module.exports = (config: unknown) => config;',
      commonjsWithImport:
        "import { helper } from './helper';\nmodule.exports = (config: unknown) => helper(config);",
      commonjsWithExport: 'export const helper = 1;\nmodule.exports = () => helper;',
      noModuleSyntax: 'const helper = 1;',
      empty: '',
    });

    expect(shapes).toEqual({
      expression: 'default',
      fn: 'default',
      klass: 'default',
      abstractClass: 'default',
      renamed: 'default',
      reexportDefault: 'default',
      namespaceDefault: 'default',
      exportEquals: 'export-equals',
      // `export *` never re-exports `default`
      starOnly: 'no-default',
      namedOnly: 'no-default',
      // A type has no runtime value
      typeOnly: 'no-default',
      defaultInterface: 'no-default',
      typeSpecifier: 'no-default',
      typeOnlyExport: 'no-default',
      importOnly: 'no-default',
      // The assignment replaces the exports of the compiled module, ECMAScript syntax or not
      commonjs: 'commonjs',
      commonjsWithImport: 'commonjs',
      commonjsWithExport: 'commonjs',
      noModuleSyntax: 'commonjs',
      empty: 'commonjs',
    });
    expect(logger.warnings).toBe(0);
  });

  test('does not read JS sources without a sibling declaration file or `allowJs`', async () => {
    const { scanned, logger } = await scanIn({
      'legacy.js': 'export default () => 1;',
      'missing.js': null,
    });

    expect(scanned.map((source) => source.module)).toEqual([undefined, undefined]);
    expect(logger.warnings).toBe(0);
  });

  describe('reads the file TypeScript reads for the import of each source', () => {
    const scanApp = async (files: Record<string, string>, allowJs: boolean) => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'strapi-typegen-sources-'));
      roots.push(root);
      for (const [file, content] of Object.entries(files)) {
        await fs.writeFile(path.join(root, file), content);
      }
      // Declaration files are not sources (see `collectAppSources`)
      const sources = Object.keys(files)
        .filter((file) => file.endsWith('.d.ts') === false)
        .map((file) => ({
          uid: `api::${file}.${file}`,
          file: path.join(root, file),
          specifier: '',
        }));
      const logger = createLogger({ silent: true });
      const scanned = await scanSources(sources, logger, { allowJs });

      return {
        files: Object.fromEntries(
          scanned.map((source) => [
            path.basename(source.file),
            source.module === undefined ? undefined : path.basename(source.module.file),
          ])
        ),
        logger,
      };
    };

    const files = {
      'typed.ts': 'export default () => 1;',
      // A declaration file next to a TypeScript source is not read: the import resolves to the source
      'typed.d.ts': 'export default 1;',
      'declared.js': 'module.exports = () => 1;',
      'declared.d.ts': 'declare const factory: () => number;\nexport = factory;',
      'plain.js': 'module.exports = () => 1;',
    };

    test.each([
      [false, { 'typed.ts': 'typed.ts', 'declared.js': 'declared.d.ts', 'plain.js': undefined }],
      [true, { 'typed.ts': 'typed.ts', 'declared.js': 'declared.d.ts', 'plain.js': 'plain.js' }],
    ])('with allowJs %s', async (allowJs, expected) => {
      const { files: read, logger } = await scanApp(files, allowJs);

      expect(read).toEqual(expected);
      expect(logger.warnings).toBe(0);
    });

    test('reads the module shape of a sibling declaration file', async () => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'strapi-typegen-sources-'));
      roots.push(root);
      const declarations = {
        exportEquals: 'declare const factory: () => number;\nexport = factory;',
        exportDefault: 'declare const factory: () => number;\nexport default factory;',
        namedOnly: 'export declare const helper: number;',
        // A declaration file without ECMAScript module syntax is not a module (TS2306)
        script: 'declare const factory: () => number;',
      };
      for (const [name, content] of Object.entries(declarations)) {
        await fs.writeFile(path.join(root, `${name}.js`), 'module.exports = () => 1;');
        await fs.writeFile(path.join(root, `${name}.d.ts`), content);
      }

      const scanned = await scanSources(
        Object.keys(declarations).map((name) => ({
          uid: name,
          file: path.join(root, `${name}.js`),
          specifier: '',
        })),
        createLogger({ silent: true })
      );

      expect(
        Object.fromEntries(
          scanned.map((source) => [
            source.uid,
            [source.module?.shape, hasModuleType(source), source.module?.typedExports],
          ])
        )
      ).toEqual({
        exportEquals: ['export-equals', true, false],
        exportDefault: ['default', true, false],
        namedOnly: ['no-default', true, false],
        script: ['commonjs', false, false],
      });
    });

    test('warns and registers a JS source as unknown when its file cannot be read', async () => {
      const { scanned, logger } = await (async () => {
        const logger = createLogger({ silent: true });
        const [source] = await writeSources({ 'missing.js': null });
        return { scanned: await scanSources([source], logger, { allowJs: true }), logger };
      })();

      expect(scanned[0].module).toBeUndefined();
      expect(hasModuleType(scanned[0])).toBe(false);
      expect(logger.warnings).toBe(1);
    });
  });

  test('reads the module shape of each JS source with `allowJs`', async () => {
    const logger = createLogger({ silent: true });
    const scanned = await scanSources(
      await writeSources({
        'esmDefault.js': 'export default () => 1;',
        'esmNamed.js': 'export const helper = 1;',
        'assigned.js': 'module.exports = () => 1;',
        'exportsMember.js': 'exports.handler = () => true;',
        'moduleExportsMember.js': 'module.exports.handler = () => true;',
        // TypeScript reads the ECMAScript module syntax and ignores the assignment
        'mixed.js': 'export const helper = 1;\nmodule.exports = () => helper;',
        // Not a module for TypeScript: its import fails with TS2306
        'script.js': 'const helper = 1;',
        'requireOnly.js': "const path = require('path');",
        // Only top-level assignments are read
        'nested.js': 'if (true) {\n  module.exports = () => 1;\n}',
      }),
      logger,
      { allowJs: true }
    );

    expect(
      Object.fromEntries(
        scanned.map((source) => [
          path.basename(source.file),
          [source.module?.shape, hasModuleType(source)],
        ])
      )
    ).toEqual({
      'esmDefault.js': ['default', true],
      'esmNamed.js': ['no-default', true],
      'assigned.js': ['commonjs', true],
      'exportsMember.js': ['commonjs', true],
      'moduleExportsMember.js': ['commonjs', true],
      'mixed.js': ['commonjs', false],
      'script.js': ['commonjs', false],
      'requireOnly.js': ['commonjs', false],
      'nested.js': ['commonjs', false],
    });
    expect(logger.warnings).toBe(0);
  });

  test('does not type the exports of a CommonJS-style TypeScript source', async () => {
    const scanned = await scanSources(
      await writeSources({
        assigned: 'module.exports = () => 1;',
        exportsMember: 'exports.handler = () => true;',
      }),
      createLogger({ silent: true }),
      { allowJs: true }
    );

    expect(scanned.map((source) => [source.module?.shape, hasModuleType(source)])).toEqual([
      ['commonjs', false],
      ['commonjs', false],
    ]);
  });

  test('keeps a source that cannot be read unscanned, with a warning', async () => {
    const { scanned, logger } = await scanIn({
      missing: null,
      typed: 'export default () => 1;',
    });

    expect(scanned.map((source) => source.module?.shape)).toEqual([undefined, 'default']);
    expect(logger.warnings).toBe(1);
  });
});

describe('findTypeExports', () => {
  const findIn = async (files: Record<string, string | null>, name = 'ServiceContract') => {
    const logger = createLogger({ silent: true });
    const scanned = await scanSources(await writeSources(files), logger);
    const found = findTypeExports(scanned, name, logger);

    return { found: Array.from(found).sort(), logger };
  };

  test('finds exported type aliases, interfaces and export specifiers', async () => {
    const { found, logger } = await findIn({
      alias: 'export type ServiceContract = { find(): number };',
      declared: 'export declare type ServiceContract = { find(): number };',
      iface: 'export interface ServiceContract { find(): number }',
      local: 'type ServiceContract = { find(): number };\nexport { ServiceContract };',
      renamed: 'type Contract = { find(): number };\nexport { type Contract as ServiceContract };',
      reexport: "export type { Contract as ServiceContract } from './contract';",
      reexportValue: "export { ServiceContract } from './contract';",
      withDefault:
        'export type ServiceContract = { find(): number };\nexport default () => ({ find: () => 1 });',
    });

    expect(found).toEqual(
      [
        'alias',
        'declared',
        'iface',
        'local',
        'reexport',
        'reexportValue',
        'renamed',
        'withDefault',
      ].map((key) => `api::${key}.${key}`)
    );
    expect(logger.warnings).toBe(0);
  });

  test('ignores other names, values, nested and non-exported declarations', async () => {
    const { found, logger } = await findIn({
      otherKind: 'export type ControllerContract = { find(): number };',
      otherName: 'export type Contract = { find(): number };',
      notExported: 'type ServiceContract = { find(): number };',
      defaultInterface: 'export default interface ServiceContract { find(): number }',
      constant: 'export const ServiceContract = { find: () => 1 };',
      fn: 'export function ServiceContract() {}',
      klass: 'export class ServiceContract {}',
      namespaced: 'export namespace Types { export type ServiceContract = { find(): number } }',
      star: "export * from './contract';",
      starAs: "export * as ServiceContract from './contract';",
      renamedAway:
        'type ServiceContract = { find(): number };\nexport { ServiceContract as Other };',
      empty: '',
    });

    expect(found).toEqual([]);
    expect(logger.warnings).toBe(0);
  });

  test('ignores a generic contract with a type parameter that has no default, with a warning', async () => {
    const { found, logger } = await findIn({
      alias: 'export type ServiceContract<T> = { find(): T };',
      iface: 'export interface ServiceContract<T, U = number> { find(): [T, U] }',
      defaults: 'export type ServiceContract<T = number> = { find(): T };',
      ifaceDefaults: 'export interface ServiceContract<T = number> { find(): T }',
    });

    // The generated file references the contract without type arguments
    expect(found).toEqual(['api::defaults.defaults', 'api::ifaceDefaults.ifaceDefaults']);
    expect(logger.warnings).toBe(2);
  });

  test('checks an export specifier against the local declaration it names', async () => {
    const { found, logger } = await findIn({
      defaults:
        'type Contract<T = number> = { find(): T };\nexport { Contract as ServiceContract };',
      klass: 'class Contract { find() { return 1; } }\nexport { Contract as ServiceContract };',
      enumeration: 'enum ServiceContract { Find }\nexport { ServiceContract };',
      // The type of a name that is both a type and a value is what the generated file reads
      merged:
        'const ServiceContract = 1;\ntype ServiceContract = { find(): number };\nexport { ServiceContract };',
      imported: "import { Contract } from './contract';\nexport { Contract as ServiceContract };",
      importedType:
        "import type { Contract } from './contract';\nexport type { Contract as ServiceContract };",
      notDeclared: 'export { ServiceContract };',
    });

    expect(found).toEqual(
      ['defaults', 'enumeration', 'imported', 'importedType', 'klass', 'merged', 'notDeclared'].map(
        (key) => `api::${key}.${key}`
      )
    );
    expect(logger.warnings).toBe(0);
  });

  test('ignores a specifier of a local generic without defaults or of a value, with a warning', async () => {
    const { found, logger } = await findIn({
      alias: 'type ServiceContract<T> = { find(): T };\nexport { ServiceContract };',
      iface: 'interface Contract<T> { find(): T }\nexport { type Contract as ServiceContract };',
      klass: 'declare class Contract<T> { find(): T }\nexport { Contract as ServiceContract };',
      constant: 'const ServiceContract = { find: () => 1 };\nexport { ServiceContract };',
      destructured:
        'const { ServiceContract } = { ServiceContract: { find: () => 1 } };\nexport { ServiceContract };',
      fn: 'function contract() {}\nexport type { contract as ServiceContract };',
    });

    // The generated file would fail with TS2314 for a generic, TS2694 for a value
    expect(found).toEqual([]);
    expect(logger.warnings).toBe(6);
  });

  test('looks for the requested name', async () => {
    const { found } = await findIn(
      {
        service: 'export type ServiceContract = { find(): number };',
        controller: 'export type ControllerContract = { find(): number };',
      },
      'ControllerContract'
    );

    expect(found).toEqual(['api::controller.controller']);
  });

  test('skips JS sources without reading them', async () => {
    const { found, logger } = await findIn({
      'legacy.js': 'export type ServiceContract = { find(): number };',
      'missing.js': null,
    });

    expect(found).toEqual([]);
    expect(logger.warnings).toBe(0);
  });

  test('skips a source that cannot be read, with a warning', async () => {
    const { found, logger } = await findIn({
      missing: null,
      alias: 'export type ServiceContract = { find(): number };',
    });

    expect(found).toEqual(['api::alias.alias']);
    expect(logger.warnings).toBe(1);
  });
});
