import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { compareCodeUnits } from '../../../generators/common/compare';
import {
  filterRegisteredSources,
  findTypeExports,
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

describe('findTypeExports', () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  // One source per entry, named after its key: `<key>.ts`, or the key itself when it has an extension
  const findIn = async (files: Record<string, string | null>, name = 'ServiceContract') => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'strapi-typegen-sources-'));
    roots.push(root);

    const sources = await Promise.all(
      Object.entries(files).map(async ([key, content]) => {
        const file = path.join(root, path.extname(key) === '' ? `${key}.ts` : key);
        // `null` leaves the file out, so that reading it fails
        if (content !== null) {
          await fs.writeFile(file, content);
        }
        return { uid: `api::${key}.${key}`, file, specifier: `./${key}` };
      })
    );

    const logger = createLogger({ silent: true });
    const found = await findTypeExports(sources, name, logger);

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
