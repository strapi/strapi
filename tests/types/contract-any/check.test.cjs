'use strict';

// Self-tests of the contract `any` check, over in-memory programs. They need no build.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, test } = require('node:test');
const ts = require('typescript');

const {
  compare,
  createVirtualProgram,
  createWalker,
  formatList,
  scanProgram,
  sourceLineOf,
  updateList,
} = require('./check.cjs');

const options = {
  noEmit: true,
  strict: true,
  skipLibCheck: true,
  types: [],
  target: ts.ScriptTarget.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ESNext,
};
const root = path.join(__dirname, '__self_test__.ts');

/** Compiles `text` as one module and returns its checker and source file. */
const compile = (text, files = {}) => {
  const program = createVirtualProgram({ [root]: text, ...files }, options);
  return { checker: program.getTypeChecker(), sourceFile: program.getSourceFile(root) };
};

/** The type of the exported alias `name`. */
const aliasType = ({ checker, sourceFile }, name) => {
  const statement = sourceFile.statements.find(
    (s) => ts.isTypeAliasDeclaration(s) && s.name.text === name
  );
  return checker.getTypeAtLocation(statement.name);
};

/** The `any` paths of the alias `T` in `text`. */
const pathsOf = (text, { depth = 6, isStop, files } = {}) => {
  const compiled = compile(text, files);
  const walk = createWalker(compiled.checker, { isStop });
  return walk(aliasType(compiled, 'T'), depth).map((found) => found.path);
};

describe('walk', () => {
  test('finds any in members, parameters, results and index signatures', () => {
    assert.deepEqual(pathsOf('export type T = { a: any; b: string };'), ['a']);
    assert.deepEqual(pathsOf('export type T = (id: any) => void;'), ['(id)']);
    assert.deepEqual(pathsOf('export type T = () => any;'), ['=>']);
    assert.deepEqual(pathsOf('export type T = { [key: string]: any };'), ['[index]']);
    assert.deepEqual(pathsOf('export type T = any;'), ['']);
  });

  test('finds any in promise, array, map and set items', () => {
    assert.deepEqual(pathsOf('export type T = Promise<any>;'), ['Promise<0>']);
    assert.deepEqual(pathsOf('export type T = Array<{ value: any }>;'), ['Array<0>.value']);
    assert.deepEqual(pathsOf('export type T = ReadonlyArray<any>;'), ['Array<0>']);
    assert.deepEqual(pathsOf('export type T = Map<string, any>;'), ['Map<1>']);
    assert.deepEqual(pathsOf('export type T = ReadonlySet<any>;'), ['Set<0>']);
  });

  // The `walkChecks` cases of the type-level walk that this check replaced.
  test('finds nested any, any records in parameters and rest parameters', () => {
    assert.deepEqual(
      pathsOf('export type T = (id: number) => Promise<{ items: Array<{ value: any }> }>;'),
      ['=>.Promise<0>.items.Array<0>.value']
    );
    assert.deepEqual(
      pathsOf('export type T = { update(params: { where: Record<string, any> }): void };'),
      ['update.(params).where.[index]']
    );
    assert.deepEqual(pathsOf('export type T = (...args: any[]) => void;'), ['(args).Array<0>']);
    assert.deepEqual(
      pathsOf('export type T = (id: number) => Promise<{ items: Array<{ value: string }> }>;'),
      []
    );
  });

  test('walks each member of a union and an intersection', () => {
    assert.deepEqual(pathsOf('export type T = { a: string } | { b: any };'), ['b']);
    assert.deepEqual(pathsOf('export type T = { a: string } & { b: any };'), ['b']);
  });

  test('reports the error type as <error>', () => {
    const compiled = compile("export type T = { result: import('./does-not-exist').Result };");
    const walk = createWalker(compiled.checker);
    assert.deepEqual(
      walk(aliasType(compiled, 'T'), 6).map((found) => found.path),
      ['result.<error>']
    );
  });

  test('reports every route to a shared type, and stops at cycles', () => {
    const text = [
      'type Shared = { value: any };',
      'export type T = { first: Shared; second: Shared };',
    ].join('\n');
    assert.deepEqual(pathsOf(text), ['first.value', 'second.value']);
    // `next` is `Node` again, on the current path: not entered.
    assert.deepEqual(pathsOf('type Node = { next: Node; value: any }; export type T = Node;'), [
      'value',
    ]);
  });

  test('stops at the depth cap', () => {
    const text = 'export type T = { a: { b: { c: any } } };';
    assert.deepEqual(pathsOf(text, { depth: 3 }), ['a.b.c']);
    assert.deepEqual(pathsOf(text, { depth: 2 }), []);
  });

  test('stops at the types the caller excludes (a nested Core.Strapi)', () => {
    const text = [
      'declare class FakeStrapi { db: any }',
      'export type T = { load(): Promise<FakeStrapi>; other: { db: any } };',
    ].join('\n');
    const isStop = (type) => type.symbol?.name === 'FakeStrapi';
    assert.deepEqual(pathsOf(text, { isStop }), ['other.db']);
    assert.deepEqual(pathsOf(text), ['load.=>.Promise<0>.db', 'other.db']);
  });

  test('does not enter TypeScript lib or third-party types', () => {
    const thirdParty = path.join(__dirname, 'node_modules/third-party/index.d.ts');
    const text = [
      "import type { Session } from './node_modules/third-party/index';",
      'export type T = { date: Date; session: Session; field: Session["store"] };',
    ].join('\n');
    assert.deepEqual(
      pathsOf(text, { files: { [thirdParty]: 'export type Session = { store: any };' } }),
      ['field']
    );
    // Lib aliases that map the caller's types are walked.
    assert.deepEqual(pathsOf('export type T = Partial<{ a: any }>;'), ['a']);
  });

  test('skips ES private names', () => {
    assert.deepEqual(pathsOf('declare class C { #secret: any; open: any }; export type T = C;'), [
      'open',
    ]);
  });
});

describe('scan', () => {
  const text = [
    'type FakeDatabase = { phase: any; deep: { deeper: { deepest: any } } };',
    'declare global { namespace Strapi { namespace Registries {',
    '  interface PackageServices {',
    "    'plugin::x.a': { find(id: number): Promise<any>; clean(): string };",
    "    'plugin::x.b': { clean(): string } | undefined;",
    '  }',
    "  interface PackageConfigs { 'plugin::x': { options: any } }",
    '  interface ContainerEntries { db: FakeDatabase }',
    '  interface Settings { anything: any }',
    '} } }',
    'declare class FakeStrapi {',
    "  plugins: { x: Strapi.Registries.PackageServices['plugin::x.a'] };",
    '  db: FakeDatabase;',
    '  load(): Promise<FakeStrapi>;',
    '}',
    'export type __Core0 = FakeStrapi;',
    'export type __Core1 = (ctx: { body: any }) => void;',
  ].join('\n');
  const coreRoots = [
    { alias: '__Core0', name: 'Core.Strapi', members: true, depth: 3 },
    { alias: '__Core1', name: 'Core.MiddlewareHandler', members: false, depth: 6 },
  ];

  test('lists registry members, registry entries and core roots', () => {
    const program = createVirtualProgram({ [root]: text }, options);
    const rows = scanProgram({
      program,
      fileName: root,
      scope: 'unknown',
      coreRoots,
      isStrapiInstance: (type) => type.symbol?.name === 'FakeStrapi',
    });
    assert.deepEqual(
      rows.map((row) => `${row.key} ${row.path}`),
      [
        // A core API registry: as deep as `Core.Strapi` members, so `deep.deeper.deepest` is past.
        'ContainerEntries db * phase',
        'PackageConfigs plugin::x * options',
        'PackageServices plugin::x.a find =>.Promise<0>',
        // `plugins.x.find` and `db.phase` repeat registry rows: dropped.
        'Core.MiddlewareHandler * (ctx).body',
      ]
    );
    assert.ok(rows.every((row) => row.scope === 'unknown'));
  });
});

describe('compare', () => {
  const found = {
    'PackageServices plugin::x.a find': {
      paths: ['=>.Promise<0>'],
      sites: ['x.ts:1'],
      scopes: ['licensed'],
    },
  };

  test('passes when the list matches', () => {
    const list = {
      members: {
        'PackageServices plugin::x.a find': { reason: 'third-party', paths: ['=>.Promise<0>'] },
      },
    };
    assert.deepEqual(compare(found, list), []);
  });

  test('reports a new member or path', () => {
    const problems = compare(found, { members: {} });
    assert.deepEqual(
      problems.map((p) => p.kind),
      ['new']
    );
    assert.match(problems[0].text, /^NEW any: PackageServices plugin::x\.a find {2}path: =>/);
    assert.match(problems[0].text, /declared at x\.ts:1/);
  });

  test('reports a listed path that is gone', () => {
    const list = {
      members: {
        'PackageServices plugin::x.a find': {
          reason: 'third-party',
          paths: ['=>.Promise<0>', '(id)'],
        },
      },
    };
    const problems = compare(found, list);
    assert.deepEqual(
      problems.map((p) => p.kind),
      ['gone']
    );
    assert.match(problems[0].text, /^GONE: PackageServices plugin::x\.a find {2}path: \(id\)/);
  });

  test('reports a listed member without a reason', () => {
    const list = {
      members: { 'PackageServices plugin::x.a find': { reason: ' ', paths: ['=>.Promise<0>'] } },
    };
    assert.deepEqual(
      compare(found, list).map((p) => p.kind),
      ['reason']
    );
  });
});

describe('update', () => {
  test('keeps reasons, adds new rows without a reason and drops gone rows', () => {
    const list = {
      $comment: 'kept',
      members: {
        'kept member': { reason: 'why', tracking: 'issue', paths: ['a'] },
        'gone member': { reason: 'old', paths: ['b'] },
      },
    };
    const found = {
      'kept member': { paths: ['a', 'c'], sites: [], scopes: [] },
      'new member': { paths: [''], sites: [], scopes: [] },
    };
    assert.deepEqual(updateList(found, list), {
      $comment: 'kept',
      members: {
        'kept member': { reason: 'why', tracking: 'issue', paths: ['a', 'c'] },
        'new member': { reason: '', paths: [''] },
      },
    });
  });

  test('writes the list as prettier formats it', async () => {
    const prettier = require('prettier');
    const file = path.join(__dirname, 'known-any.json');
    const list = {
      members: { 'a member': { reason: 'why', paths: ['x', 'y'] } },
    };
    const text = await formatList(list, file);
    const config = await prettier.resolveConfig(file);
    assert.equal(await prettier.check(text, { ...config, parser: 'json' }), true);
    assert.deepEqual(JSON.parse(text), list);
  });
});

describe('source map', () => {
  test('maps a declaration line to its source line', () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contract-any-'));
    try {
      const source = path.join(outDir, 'service.ts');
      fs.writeFileSync(
        source,
        '\n\nexport const service = {\n  find(id: number) {\n    return id;\n  },\n};\n'
      );
      const program = ts.createProgram({
        rootNames: [source],
        options: { declaration: true, declarationMap: true, emitDeclarationOnly: true, outDir },
      });
      program.emit();
      const declaration = path.join(outDir, 'service.d.ts');
      const lines = fs.readFileSync(declaration, 'utf8').split('\n');
      const findLine = lines.findIndex((line) => line.includes('find(')) + 1;
      assert.deepEqual(sourceLineOf(declaration, findLine), { file: source, line: 4 });
      assert.equal(sourceLineOf(path.join(outDir, 'missing.d.ts'), 1), undefined);
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  });
});
