'use strict';

// Strict-off parity: with `typescript.strictTypes` off, type generation and the types an application
// sees must equal the baseline (the branch's merge-base with develop).
//
// For each checkout, the fixture application (`./app`, no `typescript.strictTypes`) is copied to a
// temporary directory whose `node_modules` links to the checkout's own, then:
//   1. `strapi ts:generate-types` runs with that checkout's CLI, and `types/generated/*` is kept;
//   2. the application is type checked with that checkout's TypeScript, and its diagnostics are kept;
//   3. every type exported by `app/probes/surface.ts` is printed, with every Strapi-declared type
//      it reaches (members, signatures, union members, type arguments).
// The three outputs of both checkouts are diffed. Build both checkouts first.
//
// Usage: node tests/types/strict-off-parity/run.cjs --baseline <checkout> [--head <checkout>]
//          [--out <dir>] [--keep]
// Exit code 0 when the outputs are equal, 1 when they differ. `--out` keeps both outputs and the diff.

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseArgs } = require('node:util');

const MAX_NAMED_TYPES = 5000;

const { values: options } = parseArgs({
  options: {
    baseline: { type: 'string' },
    head: { type: 'string', default: path.resolve(__dirname, '../../..') },
    out: { type: 'string' },
    keep: { type: 'boolean', default: false },
  },
});

assert.ok(options.baseline !== undefined, 'Missing --baseline <checkout>');

const fixture = path.join(__dirname, 'app');

function prepare(checkout, label) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `strict-off-parity-${label}-`));
  const app = path.join(directory, 'app');

  fs.cpSync(fixture, app, { recursive: true });
  // The upload provider checks this folder while it registers.
  fs.mkdirSync(path.join(app, 'public/uploads'), { recursive: true });
  fs.symlinkSync(path.join(checkout, 'node_modules'), path.join(app, 'node_modules'), 'dir');

  return { directory, app };
}

function readTree(directory) {
  if (fs.existsSync(directory) === false) return {};

  return Object.fromEntries(
    fs
      .readdirSync(directory)
      .sort()
      .map((name) => [name, fs.readFileSync(path.join(directory, name), 'utf8')])
  );
}

function generateTypes(checkout, app) {
  const cli = path.join(checkout, 'packages/core/strapi/bin/strapi.js');

  const result = childProcess.spawnSync(process.execPath, [cli, 'ts:generate-types', '--silent'], {
    cwd: app,
    env: { ...process.env, NODE_ENV: 'development', STRAPI_TELEMETRY_DISABLED: 'true' },
    encoding: 'utf8',
    timeout: 300_000,
  });

  assert.equal(
    result.status,
    0,
    `ts:generate-types failed in ${checkout}:\n${result.stdout}\n${result.stderr}`
  );

  return readTree(path.join(app, 'types/generated'));
}

// Absolute paths differ between checkouts and temporary directories: print them relative to either.
function normalizePath(text, checkout, app) {
  const realCheckout = fs.realpathSync(checkout);
  const realApp = fs.realpathSync(app);

  return text
    .split(realApp)
    .join('<app>')
    .split(app)
    .join('<app>')
    .split(realCheckout)
    .join('<checkout>')
    .split(checkout)
    .join('<checkout>');
}

function createProgram(ts, app) {
  const configPath = path.join(app, 'tsconfig.json');
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, app);

  return ts.createProgram({
    rootNames: parsed.fileNames,
    options: { ...parsed.options, noEmit: true, incremental: false },
  });
}

function formatDiagnostics(ts, program, checkout, app) {
  const diagnostics = ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

    if (diagnostic.file === undefined) return `TS${diagnostic.code}: ${message}`;

    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

    return `${diagnostic.file.fileName}:${line + 1}:${character + 1} TS${diagnostic.code}: ${message}`;
  });

  return normalizePath(diagnostics.sort().join('\n'), checkout, app);
}

// Prints the probes, then every named type they reach whose declaration belongs to a Strapi package
// (a `packages/` file of the checkout, or the generated types of the application).
function dumpSurface(ts, program, checkout, app) {
  const checker = program.getTypeChecker();
  const flags = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseFullyQualifiedType;
  const packagesDirectory = path.join(fs.realpathSync(checkout), 'packages') + path.sep;
  const appDirectory = fs.realpathSync(app) + path.sep;
  const surface = program.getSourceFile(path.join(app, 'probes/surface.ts'));

  assert.ok(surface !== undefined, 'Missing probes/surface.ts in the fixture program');

  // Members, functions and type parameters are printed inline by the type that holds them.
  const namedFlags =
    ts.SymbolFlags.Interface |
    ts.SymbolFlags.Class |
    ts.SymbolFlags.TypeAlias |
    ts.SymbolFlags.Enum |
    ts.SymbolFlags.ValueModule;
  const named = new Map();
  const queue = [];
  const visited = new Set();

  const typeToString = (type) => checker.typeToString(type, undefined, flags);

  const isStrapiDeclaration = (declaration) => {
    const fileName = fs.realpathSync(declaration.getSourceFile().fileName);

    return (
      (fileName.startsWith(packagesDirectory) &&
        fileName.includes(`${path.sep}node_modules${path.sep}`) === false) ||
      fileName.startsWith(appDirectory)
    );
  };

  const symbolName = (symbol) => checker.getFullyQualifiedName(symbol);

  const referenceArguments = (type) =>
    (type.flags & ts.TypeFlags.Object) !== 0 && (type.objectFlags & ts.ObjectFlags.Reference) !== 0
      ? checker.getTypeArguments(type)
      : undefined;

  const visit = (type) => {
    if (type === undefined || visited.has(type)) return;
    visited.add(type);

    const symbol = type.aliasSymbol ?? type.getSymbol();
    const declaration = symbol?.declarations?.[0];

    if (
      symbol !== undefined &&
      declaration !== undefined &&
      isStrapiDeclaration(declaration) &&
      (symbol.flags & namedFlags) !== 0
    ) {
      // Each instantiation of a generic type is printed on its own.
      const typeArguments =
        type.aliasSymbol === undefined ? referenceArguments(type) : type.aliasTypeArguments;
      const name =
        typeArguments === undefined || typeArguments.length === 0
          ? symbolName(symbol)
          : `${symbolName(symbol)}<${typeArguments.map(typeToString).join(', ')}>`;

      if (named.has(name) === false && named.size < MAX_NAMED_TYPES) {
        named.set(name, type);
        queue.push(type);
      }
    }

    type.aliasTypeArguments?.forEach(visit);

    if (type.isUnionOrIntersection()) type.types.forEach(visit);

    referenceArguments(type)?.forEach(visit);

    for (const property of type.getProperties()) {
      const propertyDeclaration = property.valueDeclaration ?? property.declarations?.[0];

      if (propertyDeclaration === undefined || isStrapiDeclaration(propertyDeclaration)) {
        visit(checker.getTypeOfSymbol(property));
      }
    }

    for (const signature of [...type.getCallSignatures(), ...type.getConstructSignatures()]) {
      signature.getParameters().forEach((parameter) => {
        const parameterDeclaration = parameter.valueDeclaration ?? parameter.declarations?.[0];

        if (parameterDeclaration !== undefined) {
          visit(checker.getTypeOfSymbolAtLocation(parameter, parameterDeclaration));
        }
      });
      visit(signature.getReturnType());
    }
  };

  const describe = (type) => {
    const lines = [`  = ${typeToString(type)}`];

    // Primitives and unions print fully inline, their apparent members are noise.
    const structured = (type.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection)) !== 0;
    const properties = (structured ? [...type.getProperties()] : []).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    );

    for (const property of properties) {
      const declaration = property.valueDeclaration ?? property.declarations?.[0];

      // Members of built-in types (arrays, maps, strings) are the same in both checkouts.
      if (declaration !== undefined && isStrapiDeclaration(declaration) === false) continue;

      const optional = (property.flags & ts.SymbolFlags.Optional) !== 0 ? '?' : '';

      lines.push(
        `  ${property.name}${optional}: ${typeToString(checker.getTypeOfSymbol(property))}`
      );
    }

    for (const signature of type.getCallSignatures()) {
      lines.push(`  call ${checker.signatureToString(signature, undefined, flags)}`);
    }

    for (const kind of [ts.IndexKind.String, ts.IndexKind.Number]) {
      const index = checker.getIndexTypeOfType(type, kind);

      if (index !== undefined)
        lines.push(
          `  [${kind === ts.IndexKind.String ? 'string' : 'number'}]: ${typeToString(index)}`
        );
    }

    return lines;
  };

  const output = [];

  for (const statement of surface.statements) {
    if (ts.isTypeAliasDeclaration(statement) === false) continue;

    const type = checker.getTypeAtLocation(statement.name);

    output.push(`probe ${statement.name.text}`, ...describe(type), '');
    visit(type);
  }

  while (queue.length > 0) visit(queue.shift());

  const names = [...named.keys()].sort();

  for (const name of names) {
    output.push(`type ${name}`, ...describe(named.get(name)), '');
  }

  if (named.size >= MAX_NAMED_TYPES) output.push(`(stopped after ${MAX_NAMED_TYPES} named types)`);

  // Symbol-keyed members print with a program-specific id (`__@iterator@162`).
  return normalizePath(output.join('\n'), checkout, app).replace(/(__@\w+)@\d+/g, '$1');
}

function collect(checkout, label) {
  const { directory, app } = prepare(checkout, label);

  try {
    const generated = generateTypes(checkout, app);
    const ts = require(require.resolve('typescript', { paths: [checkout] }));
    const program = createProgram(ts, app);

    return {
      directory,
      outputs: {
        ...Object.fromEntries(
          Object.entries(generated).map(([name, content]) => [`generated/${name}`, content])
        ),
        'diagnostics.txt': formatDiagnostics(ts, program, checkout, app),
        'surface.txt': dumpSurface(ts, program, checkout, app),
      },
    };
  } finally {
    if (options.keep === false) fs.rmSync(directory, { recursive: true, force: true });
  }
}

function writeOutputs(directory, outputs) {
  for (const [name, content] of Object.entries(outputs)) {
    const file = path.join(directory, name);

    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}

function diff(baselineDirectory, headDirectory) {
  const result = childProcess.spawnSync('diff', ['-ru', baselineDirectory, headDirectory], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 256,
  });

  return result.stdout;
}

const baseline = collect(path.resolve(options.baseline), 'baseline');
const head = collect(path.resolve(options.head), 'head');
const out = options.out ?? fs.mkdtempSync(path.join(os.tmpdir(), 'strict-off-parity-out-'));

writeOutputs(path.join(out, 'baseline'), baseline.outputs);
writeOutputs(path.join(out, 'head'), head.outputs);

const changes = diff(path.join(out, 'baseline'), path.join(out, 'head'));

fs.writeFileSync(path.join(out, 'parity.diff'), changes);

const files = Object.keys({ ...baseline.outputs, ...head.outputs }).sort();

for (const file of files) {
  const equal = baseline.outputs[file] === head.outputs[file];

  console.log(`${equal ? 'same' : 'DIFF'} ${file}`);
}

if (changes === '') {
  console.log('Strict-off parity holds.');
  if (options.out === undefined) fs.rmSync(out, { recursive: true, force: true });
} else {
  console.log(`Strict-off parity broken, see ${path.join(out, 'parity.diff')}`);
  process.exitCode = 1;
}
