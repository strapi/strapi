/**
 * Task 4b: Faithful TS local-plugin proof via tsUtils.compile
 *
 * Proves that a local plugin authored as strapi-server.ts is compiled to dist
 * by the same toolchain Strapi uses (@strapi/typescript-utils compile) and that
 * the compiled JS file lands at the path the plugin loader expects.
 *
 * Also empirically determines whether package.json is copied to dist — the loader
 * (get-enabled-plugins.ts:150-154) does an UNCONDITIONAL require(join(pathToPlugin, 'package.json'))
 * for declared local plugins. If it is missing, local TS plugins break even with Tasks 1-3.
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import fsExtra from 'fs-extra';

// @strapi/typescript-utils is a JS package (no type declarations shipped)
type TsUtils = {
  compile: (dir: string, opts?: { configOptions?: Record<string, unknown> }) => Promise<void>;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tsUtils = require('@strapi/typescript-utils') as TsUtils;

// Paths inside the tmp dir that assertions reference
let tmpDir: string;
let compiledJsPath: string;
let compiledPkgJsonPath: string;
let compiledJsPluginPath: string;

const PLUGIN_NAME = 'ts-fixture';
const PLUGIN_SRC_REL = `src/plugins/${PLUGIN_NAME}`;

// The strapi-server.ts fixture uses a TS-only construct (typed parameter + `as const`)
// so transpilation is genuinely required — plain JSON.parse would reject it.
const STRAPI_SERVER_TS = `
type PluginConfig = { enabled: boolean };

const pluginMeta = {
  name: '${PLUGIN_NAME}',
  version: '0.0.0',
} as const;

export default (_config: PluginConfig) => ({
  register() {},
  bootstrap() {},
  routes: { 'content-api': { type: 'content-api' as const, routes: [] } },
  controllers: {},
  pluginMeta,
});
`.trimStart();

const PLUGIN_PACKAGE_JSON = JSON.stringify(
  {
    name: PLUGIN_NAME,
    version: '0.0.0',
    strapi: {
      kind: 'plugin',
      name: PLUGIN_NAME,
    },
  },
  null,
  2
);

const JS_PLUGIN_NAME = 'js-fixture';
const JS_PLUGIN_SRC_REL = `src/plugins/${JS_PLUGIN_NAME}`;

// CommonJS module — no TS syntax, authored in plain JS
const STRAPI_SERVER_JS = `'use strict';
module.exports = () => ({ register() {}, bootstrap() {} });
`;

const JS_PLUGIN_PACKAGE_JSON = JSON.stringify(
  {
    name: JS_PLUGIN_NAME,
    version: '0.0.0',
    strapi: {
      kind: 'plugin',
      name: JS_PLUGIN_NAME,
    },
  },
  null,
  2
);

// Kept faithfully in sync with packages/cli/create-strapi-app/templates/vanilla/tsconfig.json
const PROJECT_TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      module: 'CommonJS',
      moduleResolution: 'Node',
      lib: ['ES2020'],
      target: 'ES2019',
      strict: false,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      incremental: true,
      esModuleInterop: true,
      resolveJsonModule: true,
      allowJs: true,
      noEmitOnError: true,
      noImplicitThis: true,
      outDir: 'dist',
      rootDir: '.',
    },
    include: ['./', './**/*.ts', './**/*.js', 'src/**/*.json'],
    exclude: [
      'node_modules/',
      'build/',
      'dist/',
      '.cache/',
      '.tmp/',
      '.strapi/',
      'src/admin/',
      '**/*.test.*',
      'src/plugins/**/admin/**',
      'src/plugins/**/strapi-admin.*',
    ],
  },
  null,
  2
);

beforeAll(async () => {
  // Create isolated temp directory
  tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'strapi-ts-plugin-test-'));

  const pluginSrcDir = path.join(tmpDir, PLUGIN_SRC_REL);
  await fsExtra.ensureDir(pluginSrcDir);

  // Write TS fixture
  await fs.promises.writeFile(
    path.join(pluginSrcDir, 'strapi-server.ts'),
    STRAPI_SERVER_TS,
    'utf8'
  );
  // Write plugin package.json (src/plugins/ts-fixture/package.json)
  await fs.promises.writeFile(path.join(pluginSrcDir, 'package.json'), PLUGIN_PACKAGE_JSON, 'utf8');
  // Write project tsconfig.json
  await fs.promises.writeFile(path.join(tmpDir, 'tsconfig.json'), PROJECT_TSCONFIG, 'utf8');

  compiledJsPath = path.join(tmpDir, 'dist', PLUGIN_SRC_REL, 'strapi-server.js');
  compiledPkgJsonPath = path.join(tmpDir, 'dist', PLUGIN_SRC_REL, 'package.json');
  compiledJsPluginPath = path.join(tmpDir, 'dist', JS_PLUGIN_SRC_REL, 'strapi-server.js');

  // Write JS fixture (plain JS plugin — tests allowJs: true)
  const jsPluginSrcDir = path.join(tmpDir, JS_PLUGIN_SRC_REL);
  await fsExtra.ensureDir(jsPluginSrcDir);
  await fs.promises.writeFile(
    path.join(jsPluginSrcDir, 'strapi-server.js'),
    STRAPI_SERVER_JS,
    'utf8'
  );
  await fs.promises.writeFile(
    path.join(jsPluginSrcDir, 'package.json'),
    JS_PLUGIN_PACKAGE_JSON,
    'utf8'
  );

  // Invokes the same @strapi/typescript-utils compile() the server uses at startup
  await tsUtils.compile(tmpDir, { configOptions: { ignoreDiagnostics: true } });
});

afterAll(async () => {
  if (tmpDir) {
    await fsExtra.remove(tmpDir);
  }
});

describe('Task 4b: TS local plugin compile → dist proof', () => {
  it('compiles strapi-server.ts to dist/src/plugins/ts-fixture/strapi-server.js (core feature proof)', () => {
    // This is the fundamental assertion: the TS plugin server file must exist in dist
    // at exactly the path the plugin loader would look for it (Task 1 resolves to dist.root).
    expect(fs.existsSync(compiledJsPath)).toBe(true);
  });

  it('emitted JS is loadable (require-able) CommonJS module', () => {
    // The JS file must be valid CJS that Node can require without errors
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod: Record<string, unknown> = require(compiledJsPath);
    // The default export is the factory function
    const factory = mod.default ?? mod;
    expect(typeof factory).toBe('function');
  });

  /**
   * KEY FINDING: does tsUtils.compile copy package.json to dist?
   *
   * The loader (get-enabled-plugins.ts:150-154) does:
   *   const packagePath = join(pathToPlugin, 'package.json');
   *   const packageInfo = require(packagePath);   // UNCONDITIONAL — throws if missing
   *
   * For a TS project, pathToPlugin = dist/src/plugins/ts-fixture (Task 1).
   * If package.json is NOT in dist, local TS plugins break at load time despite Tasks 1-3.
   *
   * The tsconfig includes `src/**‌/*.json` and has `resolveJsonModule: true`, so tsc SHOULD
   * emit it. This test proves (or disproves) that expectation.
   */
  it('package.json IS emitted to dist/src/plugins/ts-fixture/package.json (loader requires it unconditionally)', () => {
    // If this assertion fails it means tsc did NOT copy package.json to dist.
    // That is a BLOCKER: the loader will throw when it tries to require the plugin's
    // package.json from dist/src/plugins/ts-fixture/package.json.
    // DO NOT fix the loader here — this test documents the gap; a follow-up task will address it.
    if (!fs.existsSync(compiledPkgJsonPath)) {
      // Make the gap explicit and machine-readable, not a silent skip
      throw new Error(
        [
          'PACKAGE.JSON NOT IN DIST — loader gap detected.',
          `Expected: ${compiledPkgJsonPath}`,
          'The loader (get-enabled-plugins.ts:150-154) does an UNCONDITIONAL require() of',
          "join(pathToPlugin, 'package.json') for declared local plugins.",
          'For a TS project pathToPlugin resolves to the dist folder (Task 1).',
          'Since tsc does not copy package.json, local TS plugins fail to load even with Tasks 1-3.',
          'Follow-up required: make the require() optional or copy package.json in the loader.',
        ].join('\n')
      );
    }

    // If we reach here, package.json IS in dist — verify it is valid JSON
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require(compiledPkgJsonPath);
    expect(pkg.name).toBe(PLUGIN_NAME);
    expect(pkg.strapi?.kind).toBe('plugin');
  });
});

describe('allowJs regression: JS-authored local plugin emits to dist', () => {
  it('strapi-server.js from JS-authored plugin is emitted to dist (allowJs: true fix)', () => {
    // RED before allowJs is added to the tsconfig template (and the in-test tsconfig).
    // GREEN after allowJs: true is set — proves tsc emits .js inputs to dist.
    // Without allowJs, tsc silently ignores .js input files and they never appear in dist,
    // breaking local plugins authored in plain JS in TS projects.
    expect(fs.existsSync(compiledJsPluginPath)).toBe(true);
  });
});
