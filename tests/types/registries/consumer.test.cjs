'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

const repository = path.resolve(__dirname, '../../..');
const fixture = (name) => path.join(__dirname, 'fixtures', name);
const providers = [
  'packages/plugins/i18n',
  'packages/plugins/sentry',
  'packages/core/admin',
  'packages/core/content-manager',
];
const strictPackages = [
  ...providers,
  'packages/core/types',
  'packages/core/core',
  'packages/core/upload',
  'packages/core/strapi',
];
const resolutions = {
  Bundler: { moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext },
  Node: { moduleResolution: ts.ModuleResolutionKind.Node10, module: ts.ModuleKind.CommonJS },
  NodeNext: { moduleResolution: ts.ModuleResolutionKind.NodeNext, module: ts.ModuleKind.NodeNext },
};
const baseOptions = {
  noEmit: true,
  strict: true,
  noUncheckedIndexedAccess: true,
  exactOptionalPropertyTypes: true,
  esModuleInterop: true,
  resolveJsonModule: true,
  // Match generated applications. Contract fixtures still check every lookup and expected error.
  skipLibCheck: true,
  types: [],
  target: ts.ScriptTarget.ES2022,
};

function permutations(values) {
  if (values.length === 0) return [[]];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, other) => index !== other)).map((rest) => [value, ...rest])
  );
}

const orders = permutations(['generated.d.ts', 'i18n.d.ts', 'sentry.d.ts', 'overrides.d.ts']);

function declarations(directory) {
  assert.ok(fs.existsSync(directory), `Missing ${directory}. Build the packages before this test.`);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) return declarations(filename);
    return filename.endsWith('.d.ts') ? [filename] : [];
  });
}

function readManifest(directory) {
  return JSON.parse(fs.readFileSync(path.join(repository, directory, 'package.json'), 'utf8'));
}

function assertNoStrictSettings(node, source, namespaces = []) {
  const currentNamespaces = ts.isModuleDeclaration(node)
    ? [...namespaces, node.name.text]
    : namespaces;
  if (
    ts.isInterfaceDeclaration(node) &&
    node.name.text === 'Settings' &&
    currentNamespaces.slice(-2).join('.') === 'Strapi.Registries'
  ) {
    assert.equal(
      node.members.some((member) => member.name?.getText(source) === 'strict'),
      false,
      `Settings.strict leaked through ${source.fileName}`
    );
  }
  ts.forEachChild(node, (child) => assertNoStrictSettings(child, source, currentNamespaces));
}

function diagnostics(program) {
  return ts.getPreEmitDiagnostics(program);
}

function assertClean(program, description) {
  const errors = diagnostics(program);
  assert.equal(
    errors.length,
    0,
    `${description}\n${ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: (filename) => filename,
      getCurrentDirectory: () => repository,
      getNewLine: () => '\n',
    })}`
  );
}

// Parse dependency declarations once per resolver. Every check gets a fresh program and checker.
function compiler(options) {
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile;
  const files = new Map();
  host.getSourceFile = (filename, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (shouldCreateNewSourceFile || !files.has(filename)) {
      files.set(filename, getSourceFile(filename, languageVersion, onError));
    }
    return files.get(filename);
  };
  return (names, overrides = {}) =>
    ts.createProgram({
      rootNames: names.map((name) => (path.isAbsolute(name) ? name : fixture(name))),
      options: { ...options, ...overrides },
      host,
    });
}

test('published declarations do not activate strict registries', () => {
  for (const directory of strictPackages) {
    const files = declarations(path.join(repository, directory, 'dist'));
    assert.notEqual(files.length, 0, `No declarations in ${directory}/dist`);
    for (const filename of files) {
      const contents = fs.readFileSync(filename, 'utf8');
      const references = ts.preProcessFile(contents);
      for (const reference of [
        ...references.importedFiles,
        ...references.typeReferenceDirectives,
      ]) {
        assert.doesNotMatch(
          reference.fileName,
          /(?:@strapi\/types\/strict$|\/strict-types$|strict-type-augmentations)/,
          `Strict activation leaked through ${filename}`
        );
      }

      const source = ts.createSourceFile(filename, contents, ts.ScriptTarget.Latest);
      assertNoStrictSettings(source, source);
    }
  }
});

test('published registry contracts reference declared dependencies', () => {
  for (const directory of providers) {
    const manifest = readManifest(directory);
    const files = declarations(path.join(repository, directory, 'dist/server/src/types'));
    assert.notEqual(files.length, 0, `No registry contracts emitted for ${manifest.name}`);
    for (const filename of files) {
      for (const imported of ts.preProcessFile(fs.readFileSync(filename, 'utf8')).importedFiles) {
        if (imported.fileName.startsWith('.')) continue;
        const segments = imported.fileName.split('/');
        const dependency = segments.slice(0, imported.fileName.startsWith('@') ? 2 : 1).join('/');
        assert.ok(
          manifest.dependencies?.[dependency],
          `${filename} references ${dependency}, which must be a dependency of ${manifest.name}`
        );
      }
    }
  }
});

for (const [resolution, resolutionOptions] of Object.entries(resolutions)) {
  const options = { ...baseOptions, ...resolutionOptions };
  const compile = compiler(options);

  test(`${resolution}: ordinary Strapi entry does not activate strict registries`, () => {
    assertClean(compile(['normal-entry.ts']), `${resolution}, ordinary Strapi entry`);
  });

  test(`${resolution}: one application import enables bundled contracts`, () => {
    assertClean(
      compile([
        'strapi-strict.d.ts',
        'generated.d.ts',
        'common.ts',
        'strict.ts',
        'bundled-providers.ts',
      ]),
      `${resolution}, single application opt-in`
    );
  });

  test(`${resolution}: application opt-in works through compilerOptions.types`, () => {
    assertClean(
      compile(['generated.d.ts', 'common.ts', 'strict.ts', 'bundled-providers.ts'], {
        types: ['@strapi/strapi/strict-types'],
      }),
      `${resolution}, application compilerOptions.types opt-in`
    );
  });

  test(`${resolution}: generated plugin contracts follow installation without activating strictness`, async () => {
    const { generators } = require('@strapi/typescript-utils');
    const appDir = fs.mkdtempSync(path.join(__dirname, '.generated-'));
    const generatedFile = path.join(appDir, 'types/generated/plugins.d.ts');
    const manifest = readManifest('packages/plugins/sentry');
    let enabledPlugins = {
      sentry: {
        enabled: true,
        pathToPlugin: path.join(repository, 'packages/plugins/sentry'),
        packageInfo: manifest,
        info: { packageName: manifest.name },
      },
    };
    const strapi = {
      get plugins() {
        return Object.fromEntries(Object.keys(enabledPlugins).map((name) => [name, {}]));
      },
      config: {
        get(name) {
          return name === 'enabledPlugins' ? enabledPlugins : { [manifest.name]: manifest.version };
        },
      },
    };
    const generate = () =>
      generators.generate({
        strapi,
        pwd: appDir,
        artifacts: { plugins: true },
        logger: { silent: true },
      });

    try {
      fs.writeFileSync(
        path.join(appDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            module: ts.ModuleKind[resolutionOptions.module],
            moduleResolution: resolution,
          },
        })
      );
      await generate();
      assert.equal(
        fs.readFileSync(generatedFile, 'utf8'),
        "import type {} from '@strapi/plugin-sentry/strapi-server';\n"
      );
      assertClean(
        compiler(options)([
          generatedFile,
          'normal-entry.ts',
          'generated.d.ts',
          'common.ts',
          'permissive.ts',
        ]),
        `${resolution}, generated contracts without opt-in`
      );
      assertClean(
        compiler(options)([
          generatedFile,
          'strapi-strict.d.ts',
          'generated.d.ts',
          'common.ts',
          'strict.ts',
          'defaults.ts',
        ]),
        `${resolution}, generated optional contracts with one opt-in`
      );

      enabledPlugins = {};
      await generate();
      assert.equal(fs.readFileSync(generatedFile, 'utf8'), 'export {};\n');
      assertClean(
        compiler(options)([generatedFile, 'strapi-strict.d.ts', 'bundled-providers.ts']),
        `${resolution}, removed plugin contracts after regeneration`
      );
    } finally {
      fs.rmSync(appDir, { recursive: true, force: true });
    }
  });

  test(`${resolution}: normal package entries resolve to emitted declarations`, () => {
    for (const directory of [...providers, 'packages/core/types', 'packages/core/strapi']) {
      const manifest = readManifest(directory);
      const subpath = providers.includes(directory) ? './strapi-server' : '.';
      const specifier = manifest.name + (subpath === '.' ? '' : '/strapi-server');
      const resolved = ts.resolveModuleName(specifier, fixture('common.ts'), options, ts.sys);
      assert.ok(resolved.resolvedModule, `Cannot resolve ${specifier} with ${resolution}`);
      const expected = path.join(repository, directory, manifest.exports[subpath].types);
      assert.equal(
        fs.realpathSync(resolved.resolvedModule.resolvedFileName),
        fs.realpathSync(expected),
        `${specifier} must resolve through its real package manifest with ${resolution}`
      );
    }
  });

  for (const strict of [false, true]) {
    const mode = strict ? 'on' : 'off';
    const settings = strict ? ['settings.d.ts'] : [];
    const checks = strict ? ['strict.ts'] : ['permissive.ts'];

    test(`${resolution}: switch ${mode}, package defaults`, () => {
      const program = compile([
        'generated.d.ts',
        'i18n.d.ts',
        'sentry.d.ts',
        'policies.d.ts',
        ...settings,
        'common.ts',
        ...checks,
        ...(strict ? ['defaults.ts'] : []),
      ]);
      assertClean(program, `${resolution}, switch ${mode}, package defaults`);
    });

    test(`${resolution}: switch ${mode}, application overrides in all 24 declaration orders`, () => {
      for (const order of orders) {
        const program = compile([
          ...order,
          'policies.d.ts',
          ...settings,
          'common.ts',
          ...checks,
          ...(strict ? ['application.ts'] : []),
        ]);
        assertClean(program, `${resolution}, switch ${mode}, ${order.join(' > ')}`);
      }
    });

    test(`${resolution}: switch ${mode}, registered names remain available in completions`, () => {
      const filename = fixture('completions.ts');
      const source = fs.readFileSync(filename, 'utf8');
      const service = ts.createLanguageService({
        ...ts.sys,
        getCompilationSettings: () => options,
        getCurrentDirectory: () => repository,
        getScriptFileNames: () =>
          ['i18n.d.ts', 'sentry.d.ts', 'policies.d.ts', ...settings, 'completions.ts'].map((name) =>
            fixture(name)
          ),
        getScriptVersion: () => '0',
        getScriptSnapshot(name) {
          const contents = ts.sys.readFile(name);
          return contents === undefined ? undefined : ts.ScriptSnapshot.fromString(contents);
        },
        getDefaultLibFileName: (settings) => ts.getDefaultLibFilePath(settings),
      });
      try {
        for (const [prefix, expected] of [
          ["app.config.get('", ['plugin::sentry']],
          ["app.plugin('sentry').config('", ['dsn', 'sendMetadata', 'init']],
          ["app.plugin('i18n').service('", ['locales']],
        ]) {
          const offset = source.indexOf(prefix);
          assert.notEqual(offset, -1, `Missing completion location ${prefix}`);
          const completion = service.getCompletionsAtPosition(filename, offset + prefix.length, {});
          const names = completion?.entries.map((entry) => entry.name) ?? [];
          for (const name of expected) {
            assert.ok(
              names.includes(name),
              `${prefix} should suggest ${name}; got ${names.join(', ')}`
            );
          }
        }
      } finally {
        service.dispose();
      }
    });
  }

  test(`${resolution}: compilerOptions.types can enable strict registries`, () => {
    const program = compile(
      [
        'generated.d.ts',
        'i18n.d.ts',
        'sentry.d.ts',
        'policies.d.ts',
        'common.ts',
        'strict.ts',
        'defaults.ts',
      ],
      { types: ['@strapi/types/strict'] }
    );
    assertClean(program, `${resolution}, compilerOptions.types activation`);
  });
}

test('conflicting declaration files need one contract per UID, even with the switch off', () => {
  const compile = compiler({ ...baseOptions, ...resolutions.Bundler });
  for (const strict of [false, true]) {
    const files = [
      'collision-first.d.ts',
      'collision-second.d.ts',
      ...(strict ? ['settings.d.ts'] : []),
    ];
    const checked = compile(files, { skipLibCheck: false });
    assert.deepEqual(
      diagnostics(checked).map((diagnostic) => diagnostic.code),
      [2717],
      `Conflicting contracts must report TS2717 with strict ${strict ? 'on' : 'off'}`
    );
    assertClean(compile(files), 'skipLibCheck suppresses declaration conflicts');
  }
});
