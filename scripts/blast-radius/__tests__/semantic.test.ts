import assert from 'node:assert/strict';
import test from 'node:test';
import { narrowWithTypeScript } from '../semantic';
import { loadWorkspaceSources } from '../sources';

const upperBound = ['@scope/admin', '@scope/core', '@scope/plugin'];

test('narrows exact changed declarations to production references and their reverse dependants', async () => {
  const result = await narrowWithTypeScript({
    path: 'packages/core/src/install-id.ts',
    changedRanges: [{ start: 0, end: 60 }],
    nxProjects: upperBound,
    projectRoots: {
      '@scope/core': 'packages/core',
      '@scope/admin': 'packages/admin',
      '@scope/plugin': 'packages/plugin',
    },
    reverseDependencies: {
      '@scope/core': ['@scope/admin'],
      '@scope/admin': [],
      '@scope/plugin': [],
    },
    files: {
      'packages/core/src/install-id.ts': 'export function installId() { return "x"; }',
      'packages/plugin/src/use.ts': 'import { installId } from "@scope/core"; installId();',
      'packages/admin/src/use.ts': 'import { installId } from "@scope/core"; installId();',
    },
  });
  assert.equal(result.decision, 'narrowed');
  assert.deepEqual(result.semanticProjects, ['@scope/admin', '@scope/core', '@scope/plugin']);
  assert.deepEqual(result.finalProjects, ['@scope/admin', '@scope/core', '@scope/plugin']);
});

test('excludes test-only references and falls back unchanged for unsafe semantic proof gates', async () => {
  const base = {
    path: 'packages/core/src/a.ts',
    nxProjects: upperBound,
    projectRoots: {
      '@scope/core': 'packages/core',
      '@scope/admin': 'packages/admin',
      '@scope/plugin': 'packages/plugin',
    },
    reverseDependencies: { '@scope/core': [], '@scope/admin': [], '@scope/plugin': [] },
    files: {
      'packages/core/src/a.ts': 'export const a = 1;',
      'packages/admin/src/a.test.ts': 'import { a } from "@scope/core"; a;',
    },
  };
  const testOnly = await narrowWithTypeScript({ ...base, changedRanges: [{ start: 0, end: 20 }] });
  assert.equal(testOnly.decision, 'narrowed');
  assert.deepEqual(testOnly.finalProjects, ['@scope/core']);

  for (const input of [
    { ...base, changedRanges: [], expected: 'missing-hunks' },
    {
      ...base,
      status: 'renamed',
      changedRanges: [{ start: 0, end: 20 }],
      expected: 'renamed-path',
    },
    { ...base, binary: true, changedRanges: [{ start: 0, end: 20 }], expected: 'binary-path' },
    {
      ...base,
      files: { 'packages/core/src/a.ts': 'window["dynamic"]();' },
      changedRanges: [{ start: 0, end: 20 }],
      expected: 'top-level-side-effect',
    },
  ]) {
    const result = await narrowWithTypeScript(input);
    assert.equal(result.decision, 'nx-fallback');
    assert.deepEqual(result.finalProjects, upperBound);
    assert.equal(result.reasonCodes.includes(input.expected), true);
  }
});

test('falls back for every executable top-level side effect, including initializers and omitted statement forms', async () => {
  const base = {
    path: 'packages/core/src/api.ts',
    changedRanges: [{ start: 1, end: 2 }],
    nxProjects: ['@scope/consumer', '@scope/core'],
    projectRoots: { '@scope/core': 'packages/core', '@scope/consumer': 'packages/consumer' },
    reverseDependencies: { '@scope/core': [], '@scope/consumer': [] },
  };
  for (const source of [
    'function register() { return 1; }\nexport const api = register();\n',
    'export function api() { return 1; }\nwhile (false) {}\n',
  ]) {
    const result = await narrowWithTypeScript({
      ...base,
      files: {
        'packages/core/src/api.ts': source,
        'packages/consumer/src/use.ts': 'import "@scope/core";\n',
      },
    });
    assert.equal(result.decision, 'nx-fallback');
    assert.deepEqual(result.finalProjects, ['@scope/consumer', '@scope/core']);
    assert.equal(result.reasonCodes.includes('top-level-side-effect'), true);
  }
});

test('falls back for class static initialization and side-effect-only module-evaluation forms', async () => {
  const base = {
    path: 'packages/core/src/api.ts',
    changedRanges: [{ start: 0, end: 1 }],
    nxProjects: ['@scope/consumer', '@scope/core'],
    projectRoots: { '@scope/core': 'packages/core', '@scope/consumer': 'packages/consumer' },
    reverseDependencies: { '@scope/core': [], '@scope/consumer': [] },
    files: {
      'packages/core/src/effect.ts': 'export const effect = 1;\n',
      'packages/consumer/src/use.ts': 'import "@scope/core";\n',
    },
  };
  for (const source of [
    'export class Registry { static { register(); } }\nfunction register() {}\n',
    'export class Registry { static value = register(); }\nfunction register() {}\n',
    'import "./effect";\nexport function api() { return 1; }\n',
    'export * from "./effect";\nexport function api() { return 1; }\n',
    'import effect = require("./effect");\nexport function api() { return effect; }\n',
  ]) {
    const result = await narrowWithTypeScript({
      ...base,
      files: { ...base.files, 'packages/core/src/api.ts': source },
    });
    assert.equal(result.decision, 'nx-fallback');
    assert.deepEqual(result.finalProjects, ['@scope/consumer', '@scope/core']);
    assert.equal(result.reasonCodes.includes('top-level-side-effect'), true);
  }
});

test('does not expand reverse dependants from the changed owner without a real symbol reference', async () => {
  const result = await narrowWithTypeScript({
    path: 'packages/core/src/api.ts',
    changedRanges: [{ start: 2, end: 3 }],
    nxProjects: ['consumer-a', 'consumer-b', 'core'],
    projectRoots: {
      core: 'packages/core',
      'consumer-a': 'packages/consumer-a',
      'consumer-b': 'packages/consumer-b',
    },
    reverseDependencies: {
      core: ['consumer-a', 'consumer-b'],
      'consumer-a': [],
      'consumer-b': [],
    },
    files: {
      'packages/core/src/api.ts': '\n\nexport function api() { return 1; }\n',
      'packages/consumer-a/src/use.ts': 'import { api } from "../../core/src/api";\napi();\n',
      'packages/consumer-b/src/use.ts': 'export const unrelated = true;\n',
    },
  });

  assert.equal(result.decision, 'narrowed');
  assert.deepEqual(result.finalProjects, ['consumer-a', 'core']);
  assert.equal(result.finalProjects.includes('consumer-b'), false);
});

test('sorts supplementary-plane reference paths by Unicode code point', async () => {
  const first = 'packages/\u{e000}/src/use.ts';
  const second = 'packages/\u{10000}/src/use.ts';
  const original = String.prototype.localeCompare;
  String.prototype.localeCompare = function (this: string, other: string) {
    return this < other ? 1 : this > other ? -1 : 0;
  } as typeof String.prototype.localeCompare;
  try {
    const result = await narrowWithTypeScript({
      path: 'packages/core/src/api.ts',
      changedRanges: [{ start: 2, end: 3 }],
      nxProjects: ['core', 'first', 'second'],
      projectRoots: {
        core: 'packages/core',
        first: 'packages/\u{e000}',
        second: 'packages/\u{10000}',
      },
      reverseDependencies: { core: [], first: [], second: [] },
      files: {
        'packages/core/src/api.ts': '\n\nexport function api() { return 1; }\n',
        [first]: 'import { api } from "../../core/src/api";\napi();\n',
        [second]: 'import { api } from "../../core/src/api";\napi();\n',
      },
    });
    assert.deepEqual(
      result.references.map((reference) => reference.path),
      [first, second]
    );
  } finally {
    String.prototype.localeCompare = original;
  }
});

test('read-only real-workspace smoke retains full Nx reach for generateInstallId dynamic candidates', async () => {
  const projectRoots = {
    '@strapi/utils': 'packages/core/utils',
    '@strapi/core': 'packages/core/core',
    '@strapi/strapi': 'packages/core/strapi',
    '@strapi/database': 'packages/core/database',
  };
  const loaded = await loadWorkspaceSources({ projectRoots, projects: Object.keys(projectRoots) });
  assert.equal(loaded.complete, true);
  const path = 'packages/core/utils/src/install-id.ts';
  const source = loaded.files[path];
  assert.ok(source, 'generateInstallId source must be available in the checked-out workspace');
  const start = source.slice(0, source.indexOf('generateInstallId')).split('\n').length - 1;
  const result = await narrowWithTypeScript({
    path,
    changedRanges: [{ start, end: start + 1 }],
    nxProjects: Object.keys(projectRoots),
    projectRoots,
    reverseDependencies: {
      '@strapi/utils': [],
      '@strapi/core': [],
      '@strapi/strapi': [],
      '@strapi/database': [],
    },
    files: loaded.files,
    sourceComplete: loaded.complete,
  });
  assert.equal(result.decision, 'nx-fallback');
  assert.deepEqual(result.finalProjects, [
    '@strapi/core',
    '@strapi/database',
    '@strapi/strapi',
    '@strapi/utils',
  ]);
  assert.deepEqual(result.reasonCodes, ['module-resolution-incomplete']);
});

test('read-only real-workspace smoke narrows ParametrizedAction to permissions without logger', async () => {
  const projectRoots = {
    '@strapi/permissions': 'packages/core/permissions',
    '@strapi/logger': 'packages/utils/logger',
  };
  const loaded = await loadWorkspaceSources({ projectRoots, projects: Object.keys(projectRoots) });
  assert.equal(loaded.complete, true);
  const path = 'packages/core/permissions/src/types.ts';
  const source = loaded.files[path];
  assert.ok(source, 'ParametrizedAction source must be available in the checked-out workspace');
  const start = source.slice(0, source.indexOf('ParametrizedAction')).split('\n').length - 1;
  const result = await narrowWithTypeScript({
    path,
    changedRanges: [{ start, end: start + 1 }],
    nxProjects: Object.keys(projectRoots),
    projectRoots,
    reverseDependencies: { '@strapi/permissions': [], '@strapi/logger': [] },
    files: loaded.files,
    sourceComplete: loaded.complete,
  });
  assert.equal(result.decision, 'narrowed');
  assert.deepEqual(result.finalProjects, ['@strapi/permissions']);
  assert.equal(result.finalProjects.includes('@strapi/logger'), false);
});

test('uses TypeScript symbol identity rather than same-name text, comments, or string literals', async () => {
  const result = await narrowWithTypeScript({
    path: 'packages/core/src/api.ts',
    changedRanges: [{ start: 2, end: 3 }],
    nxProjects: ['@scope/core', '@scope/unrelated'],
    projectRoots: {
      '@scope/core': 'packages/core',
      '@scope/unrelated': 'packages/unrelated',
    },
    reverseDependencies: { '@scope/core': [], '@scope/unrelated': [] },
    files: {
      'packages/core/src/api.ts': '\n\nexport function sharedName() { return 1; }\n',
      'packages/unrelated/src/api.ts': 'export function sharedName() { return 2; }\nsharedName();',
      'packages/unrelated/src/text.ts': '// sharedName\nconst label = "sharedName";',
    },
  });

  assert.equal(result.decision, 'narrowed');
  assert.deepEqual(result.finalProjects, ['@scope/core']);
  assert.deepEqual(result.references, []);
});

test('follows imported aliases through a barrel and records the use, not the spelling in the import', async () => {
  const use = 'import { changed as installed } from "../../core/src";\ninstalled();\n';
  const result = await narrowWithTypeScript({
    path: 'packages/core/src/changed.ts',
    changedRanges: [{ start: 2, end: 3 }],
    nxProjects: ['@scope/admin', '@scope/core'],
    projectRoots: { '@scope/core': 'packages/core', '@scope/admin': 'packages/admin' },
    reverseDependencies: { '@scope/core': [], '@scope/admin': [] },
    files: {
      'packages/core/src/changed.ts': '\n\nexport function changed() { return 1; }\n',
      'packages/core/src/index.ts': 'export { changed } from "./changed";\n',
      'packages/admin/src/use.ts': use,
    },
  });

  assert.equal(result.decision, 'narrowed');
  assert.deepEqual(result.finalProjects, ['@scope/admin', '@scope/core']);
  assert.deepEqual(result.references, [
    {
      path: 'packages/admin/src/use.ts',
      project: '@scope/admin',
      offset: use.lastIndexOf('installed'),
    },
  ]);
});

test('maps zero-context Git line ranges to the declaration on that line, not byte offsets near line one', async () => {
  const result = await narrowWithTypeScript({
    path: 'packages/core/src/many.ts',
    changedRanges: [{ start: 5, end: 6 }],
    nxProjects: ['@scope/core'],
    projectRoots: { '@scope/core': 'packages/core' },
    reverseDependencies: { '@scope/core': [] },
    files: {
      'packages/core/src/many.ts': [
        'export function first() { return 1; }',
        '',
        '// unrelated line',
        '',
        '',
        'export function changedOnLineSix() { return 2; }',
      ].join('\n'),
    },
  });

  assert.equal(result.decision, 'narrowed');
  assert.deepEqual(
    result.declarations.map((declaration) => declaration.name),
    ['changedOnLineSix']
  );
});

test('retains the complete Nx bound when a Strapi package-name import cannot be proven', async () => {
  const upperBound = ['@strapi/plugin-users-permissions', '@strapi/strapi'];
  const result = await narrowWithTypeScript({
    path: 'packages/plugins/users-permissions/src/api.ts',
    changedRanges: [{ start: 2, end: 3 }],
    nxProjects: upperBound,
    projectRoots: {
      '@strapi/plugin-users-permissions': 'packages/plugins/users-permissions',
      '@strapi/strapi': 'packages/core/strapi',
    },
    reverseDependencies: {
      '@strapi/plugin-users-permissions': [],
      '@strapi/strapi': [],
    },
    files: {
      'packages/plugins/users-permissions/src/api.ts': '\n\nexport function api() { return 1; }\n',
      'packages/core/strapi/src/use.ts':
        'import { api } from "@strapi/plugin-users-permissions";\napi();\n',
    },
  });

  assert.equal(result.decision, 'nx-fallback');
  assert.deepEqual(result.finalProjects, upperBound);
  assert.equal(
    result.reasonCodes.some((code) => /resolution|module|compiler|proof/.test(code)),
    true
  );
});

test('retains the complete Nx bound unless exports and path-alias resolution are identical in every candidate program', async () => {
  const upperBound = ['@scope/core', '@scope/consumer'];
  const sortedUpperBound = ['@scope/consumer', '@scope/core'];
  for (const specifier of ['@scope/core/server', '@core/api']) {
    const result = await narrowWithTypeScript({
      path: 'packages/core/src/api.ts',
      changedRanges: [{ start: 2, end: 3 }],
      nxProjects: upperBound,
      projectRoots: { '@scope/core': 'packages/core', '@scope/consumer': 'packages/consumer' },
      reverseDependencies: { '@scope/core': [], '@scope/consumer': [] },
      files: {
        'packages/core/src/api.ts': '\n\nexport function api() { return 1; }\n',
        'packages/consumer/src/use.ts': `import { api } from "${specifier}";\napi();\n`,
      },
    });
    assert.equal(result.decision, 'nx-fallback', specifier);
    assert.deepEqual(result.finalProjects, sortedUpperBound, specifier);
  }
});

test('retains full Nx reach when a direct-import candidate has a syntactic diagnostic', async () => {
  const result = await narrowWithTypeScript({
    path: 'packages/core/src/api.ts',
    changedRanges: [{ start: 2, end: 3 }],
    nxProjects: ['consumer', 'core'],
    projectRoots: { core: 'packages/core', consumer: 'packages/consumer' },
    reverseDependencies: { core: [], consumer: [] },
    files: {
      'packages/core/src/api.ts': '\n\nexport function api() { return 1; }\n',
      'packages/consumer/src/use.ts': 'import { api } from ;\napi();\n',
    },
  });
  assert.equal(result.decision, 'nx-fallback');
  assert.deepEqual(result.finalProjects, ['consumer', 'core']);
  assert.deepEqual(result.reasonCodes, ['candidate-diagnostic']);
});

test('never returns semantic proof for a default alias candidate with an unresolved unrelated import', async () => {
  const result = await narrowWithTypeScript({
    path: 'packages/core/src/definitions.ts',
    changedRanges: [{ start: 2, end: 3 }],
    nxProjects: ['consumer', 'core'],
    projectRoots: { core: 'packages/core', consumer: 'packages/consumer' },
    reverseDependencies: { core: [], consumer: [] },
    files: {
      'packages/core/src/definitions.ts': '\n\nexport default function compute() { return 1; }\n',
      'packages/consumer/src/use.ts': [
        'import value from "../../core/src/definitions";',
        'import missing from "@unresolved/package";',
        'value();',
      ].join('\n'),
    },
  });
  assert.equal(result.decision, 'nx-fallback');
  assert.deepEqual(result.finalProjects, ['consumer', 'core']);
  assert.equal(result.reasonCodes.includes('module-resolution-incomplete'), true);
});

test('handles a foo$ declaration/reference without regex screening errors', async () => {
  const result = await narrowWithTypeScript({
    path: 'packages/core/src/api.ts',
    changedRanges: [{ start: 2, end: 3 }],
    nxProjects: ['consumer', 'core'],
    projectRoots: { core: 'packages/core', consumer: 'packages/consumer' },
    reverseDependencies: { core: [], consumer: [] },
    files: {
      'packages/core/src/api.ts': '\n\nexport function foo$() { return 1; }\n',
      'packages/consumer/src/use.ts': [
        'import { foo$ } from "../../core/src/api";',
        'import missing from "@unresolved/package";',
        'foo$();',
      ].join('\n'),
    },
  });
  assert.equal(result.decision, 'nx-fallback');
  assert.deepEqual(result.finalProjects, ['consumer', 'core']);
  assert.equal(result.reasonCodes.includes('module-resolution-incomplete'), true);
});

test('retains full Nx reach when an installed external package has an unresolved subpath', async () => {
  const result = await narrowWithTypeScript({
    path: 'packages/core/src/api.ts',
    changedRanges: [{ start: 2, end: 3 }],
    nxProjects: ['consumer', 'core', 'unrelated'],
    projectRoots: {
      core: 'packages/core',
      consumer: 'packages/consumer',
      unrelated: 'packages/unrelated',
    },
    reverseDependencies: { core: [], consumer: [], unrelated: [] },
    files: {
      'packages/core/src/api.ts': '\n\nexport function api() { return 1; }\n',
      'packages/consumer/src/use.ts': [
        'import { api } from "../../core/src/api";',
        'import absent from "lodash/not-a-real-file";',
        'api();',
        'void absent;',
      ].join('\n'),
    },
  });
  assert.equal(result.decision, 'nx-fallback');
  assert.deepEqual(result.finalProjects, ['consumer', 'core', 'unrelated']);
  assert.deepEqual(result.reasonCodes, ['module-resolution-incomplete']);
});

test('retains full Nx reach when a manifest-declared external package is not resolvable', async () => {
  const result = await narrowWithTypeScript({
    path: 'packages/utils/src/api.ts',
    changedRanges: [{ start: 2, end: 3 }],
    nxProjects: ['core', 'unrelated', 'utils'],
    projectRoots: {
      utils: 'packages/utils',
      core: 'packages/core',
      unrelated: 'packages/unrelated',
    },
    reverseDependencies: { utils: [], core: [], unrelated: [] },
    files: {
      'packages/utils/src/api.ts': '\n\nexport function api() { return 1; }\n',
      'packages/core/src/use.ts': [
        'import { api } from "../../utils/src/api";',
        'import type { McpServer } from "@modelcontextprotocol/server";',
        'api();',
        'type Server = McpServer;',
      ].join('\n'),
    },
  });
  assert.equal(result.decision, 'nx-fallback');
  assert.deepEqual(result.finalProjects, ['core', 'unrelated', 'utils']);
  assert.deepEqual(result.reasonCodes, ['module-resolution-incomplete']);
});

test('retains full Nx reach for a computed dynamic import in a non-reference candidate', async () => {
  const result = await narrowWithTypeScript({
    path: 'packages/core/src/api.ts',
    changedRanges: [{ start: 2, end: 3 }],
    nxProjects: ['consumer', 'core', 'unrelated'],
    projectRoots: {
      core: 'packages/core',
      consumer: 'packages/consumer',
      unrelated: 'packages/unrelated',
    },
    reverseDependencies: { core: [], consumer: [], unrelated: [] },
    files: {
      'packages/core/src/api.ts': '\n\nexport function api() { return 1; }\n',
      'packages/consumer/src/use.ts': [
        'const target = "../../core/src/api";',
        'import(target).then(({ api }) => api());',
      ].join('\n'),
      'packages/unrelated/src/use.ts': 'export const unrelated = true;\n',
    },
  });
  assert.equal(result.decision, 'nx-fallback');
  assert.deepEqual(result.finalProjects, ['consumer', 'core', 'unrelated']);
  assert.deepEqual(result.reasonCodes, ['module-resolution-incomplete']);
});

test('retains full Nx reach for an unresolved nonconventional static alias without an LS reference', async () => {
  const result = await narrowWithTypeScript({
    path: 'packages/core/src/api.ts',
    changedRanges: [{ start: 2, end: 3 }],
    nxProjects: ['consumer', 'core', 'unrelated'],
    projectRoots: {
      core: 'packages/core',
      consumer: 'packages/consumer',
      unrelated: 'packages/unrelated',
    },
    reverseDependencies: { core: [], consumer: [], unrelated: [] },
    files: {
      'packages/core/src/api.ts': '\n\nexport function api() { return 1; }\n',
      'packages/consumer/src/use.ts': 'import { api } from "#product-runtime/api";\napi();\n',
      'packages/unrelated/src/use.ts': 'export const unrelated = true;\n',
    },
  });
  assert.equal(result.decision, 'nx-fallback');
  assert.deepEqual(result.finalProjects, ['consumer', 'core', 'unrelated']);
  assert.deepEqual(result.reasonCodes, ['module-resolution-incomplete']);
});

test('retains full Nx reach for unresolved $product-runtime aliases without an LS reference', async () => {
  const result = await narrowWithTypeScript({
    path: 'packages/core/src/api.ts',
    changedRanges: [{ start: 2, end: 3 }],
    nxProjects: ['consumer', 'core', 'unrelated'],
    projectRoots: {
      core: 'packages/core',
      consumer: 'packages/consumer',
      unrelated: 'packages/unrelated',
    },
    reverseDependencies: { core: [], consumer: [], unrelated: [] },
    files: {
      'packages/core/src/api.ts': '\n\nexport function api() { return 1; }\n',
      'packages/consumer/src/use.ts': 'import { api } from "$product-runtime/api";\napi();\n',
      'packages/unrelated/src/use.ts': 'export const unrelated = true;\n',
    },
  });
  assert.equal(result.decision, 'nx-fallback');
  assert.deepEqual(result.finalProjects, ['consumer', 'core', 'unrelated']);
  assert.deepEqual(result.reasonCodes, ['module-resolution-incomplete']);
});

test('retains full Nx reach for unresolved @product-runtime aliases without an LS reference', async () => {
  const result = await narrowWithTypeScript({
    path: 'packages/core/src/api.ts',
    changedRanges: [{ start: 2, end: 3 }],
    nxProjects: ['consumer', 'core', 'unrelated'],
    projectRoots: {
      core: 'packages/core',
      consumer: 'packages/consumer',
      unrelated: 'packages/unrelated',
    },
    reverseDependencies: { core: [], consumer: [], unrelated: [] },
    files: {
      'packages/core/src/api.ts': '\n\nexport function api() { return 1; }\n',
      'packages/consumer/src/use.ts': 'import { api } from "@product-runtime/api";\napi();\n',
      'packages/unrelated/src/use.ts': 'export const unrelated = true;\n',
    },
  });
  assert.equal(result.decision, 'nx-fallback');
  assert.deepEqual(result.finalProjects, ['consumer', 'core', 'unrelated']);
  assert.deepEqual(result.reasonCodes, ['module-resolution-incomplete']);
});

test('retains full Nx reach for indirect CommonJS module loaders in a non-reference candidate', async () => {
  for (const source of [
    ['const load = require;', 'const target = "../../core/src/api";', 'load(target).api();'].join(
      '\n'
    ),
    ['const target = "../../core/src/api";', 'module.require(target).api();'].join('\n'),
    [
      'import { createRequire } from "node:module";',
      'const load = createRequire(import.meta.url);',
      'const target = "../../core/src/api";',
      'load(target).api();',
    ].join('\n'),
  ]) {
    const result = await narrowWithTypeScript({
      path: 'packages/core/src/api.ts',
      changedRanges: [{ start: 2, end: 3 }],
      nxProjects: ['consumer', 'core', 'unrelated'],
      projectRoots: {
        core: 'packages/core',
        consumer: 'packages/consumer',
        unrelated: 'packages/unrelated',
      },
      reverseDependencies: { core: [], consumer: [], unrelated: [] },
      files: {
        'packages/core/src/api.ts': '\n\nexport function api() { return 1; }\n',
        'packages/consumer/src/use.ts': source,
        'packages/unrelated/src/use.ts': 'export const unrelated = true;\n',
      },
    });
    assert.equal(result.decision, 'nx-fallback');
    assert.deepEqual(result.finalProjects, ['consumer', 'core', 'unrelated']);
    assert.deepEqual(result.reasonCodes, ['module-resolution-incomplete']);
  }
});
