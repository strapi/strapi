'use strict';

// Strict-off parity: with `typescript.strictTypes` off, type generation and the types an application
// sees must equal the baseline (the branch's merge-base with develop).
//
// For each checkout, the fixture application (`./app`, no `typescript.strictTypes`) is copied to a
// temporary directory whose `node_modules` links to the checkout's own, then:
//   1. `strapi ts:generate-types` runs with that checkout's CLI, and `types/generated/*` is kept;
//   2. the application is type checked with that checkout's TypeScript, and its diagnostics are kept;
//   3. every type exported by `app/probes/surface-core.ts` (`@strapi/strapi` and `@strapi/types`)
//      is printed to `surface-core.txt`, with every Strapi-declared type it reaches (members,
//      signatures, union members, type arguments). `app/probes/surface-providers.ts` (the server
//      entries of other packages) is printed the same way to `surface-providers.txt`, without the
//      types `surface-core.txt` already prints;
//   4. `app/equivalence` (types that print differently but are mutually assignable) is type checked
//      in its own program.
// Build both checkouts first.
//
// Usage: node tests/types/strict-off-parity/run.cjs --baseline <checkout> [--head <checkout>]
//          [--out <dir>] [--keep]
// The outputs of both checkouts are diffed. Exit code 0 when they are equal, 1 when they differ,
// except for `surface-providers.txt`: provider types may only widen, so its diff is reported for
// review and never fails. `--out` keeps both outputs and the diff.
//
// Usage: node tests/types/strict-off-parity/run.cjs --baseline <checkout> --update
// Rewrites the committed surfaces in `surface-baseline/` from <checkout>, which must be the branch's
// merge base with develop, built. Regenerate them at each rebase on develop.
//
// Snapshot mode, run by CI (`yarn test:types:strict-off`), checks the head checkout alone:
// `types/generated/*` must equal the committed copy in `<dir>`, `surface-core.txt` must equal
// `surface-baseline/core.txt`, and the diagnostics and equivalence programs must be empty. The diff
// of `surface-providers.txt` with `surface-baseline/providers.txt` is printed and never fails.
// `--update` rewrites `<dir>` instead of comparing with it, never `surface-baseline/`.
//
// Usage: node tests/types/strict-off-parity/run.cjs --snapshot <dir> [--update] [--head <checkout>]

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
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
    snapshot: { type: 'string' },
    update: { type: 'boolean', default: false },
  },
});

assert.ok(
  options.baseline !== undefined || options.snapshot !== undefined,
  'Missing --baseline <checkout> or --snapshot <dir>'
);
assert.ok(
  options.baseline === undefined || options.snapshot === undefined,
  '--baseline and --snapshot cannot be combined'
);
const UPDATE_COMMAND = 'yarn test:types:strict-off --update';
const SURFACE_BASELINE = path.join(__dirname, 'surface-baseline');
const SURFACE_UPDATE_COMMAND =
  'node tests/types/strict-off-parity/run.cjs --baseline <merge-base checkout> --update';
// Surface dump name → committed baseline file name.
const SURFACES = { 'surface-core.txt': 'core.txt', 'surface-providers.txt': 'providers.txt' };
// Differences in these outputs are reported, never failing.
const INFORMATIONAL = new Set(['surface-providers.txt']);

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
function pathNormalizer(checkout, app) {
  const realCheckout = fs.realpathSync(checkout);
  const realApp = fs.realpathSync(app);

  return (text) =>
    text
      .split(realApp)
      .join('<app>')
      .split(app)
      .join('<app>')
      .split(realCheckout)
      .join('<checkout>')
      .split(checkout)
      .join('<checkout>');
}

function normalizePath(text, checkout, app) {
  return pathNormalizer(checkout, app)(text);
}

// TypeScript prints union members in the order it created their types, which moves whenever a
// checkout declares more types. Union members are sorted, through the TypeScript parser, so that only
// the members themselves are compared. Text the parser rejects is kept as printed.
function unionSorter(ts) {
  const sortIn = (prefix, text, suffix) => {
    const source = `${prefix}${text}${suffix}`;
    const file = ts.createSourceFile('union.ts', source, ts.ScriptTarget.Latest, false);

    if (file.parseDiagnostics.length > 0) return undefined;

    const print = (node) => {
      if (ts.isUnionTypeNode(node)) return node.types.map(print).sort().join(' | ');

      let output = '';
      let position = node.getStart(file);

      ts.forEachChild(node, (child) => {
        output += source.slice(position, child.getStart(file)) + print(child);
        position = child.getEnd();
      });

      return output + source.slice(position, node.getEnd());
    };

    const printed = print(file.statements[0]);

    return printed.slice(prefix.length, printed.length - suffix.length);
  };

  return {
    type: (text) => sortIn('type T = ', text, ';') ?? text,
    signature: (text) =>
      sortIn('type T = { ', text, ' };') ?? sortIn('type T = ', text, ';') ?? text,
  };
}

// The equivalence checks with the generated schema types they read.
function equivalenceFiles(app) {
  const list = (directory) =>
    fs.existsSync(directory)
      ? fs
          .readdirSync(directory)
          .sort()
          .map((name) => path.join(directory, name))
      : [];

  return [...list(path.join(app, 'types/generated')), ...list(path.join(app, 'equivalence'))];
}

function createProgram(ts, app, rootNames) {
  const configPath = path.join(app, 'tsconfig.json');
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, app);

  return ts.createProgram({
    rootNames: rootNames ?? parsed.fileNames,
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

// Prints the probes of `probes/<probe>.ts`, then every named type they reach whose declaration
// belongs to a Strapi package (a `packages/` file of the checkout, or the generated types of the
// application). Types named in `exclude` are neither printed nor walked. Returns the printed text
// and the names of the printed types.
function dumpSurface(ts, program, checkout, app, probe, exclude = new Set()) {
  const checker = program.getTypeChecker();
  const flags = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseFullyQualifiedType;
  const packagesDirectory = path.join(fs.realpathSync(checkout), 'packages') + path.sep;
  const appDirectory = fs.realpathSync(app) + path.sep;
  const surface = program.getSourceFile(path.join(app, `probes/${probe}.ts`));

  assert.ok(surface !== undefined, `Missing probes/${probe}.ts in the fixture program`);

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
  const normalize = pathNormalizer(checkout, app);
  const sortUnions = unionSorter(ts);

  const typeToString = (type, extraFlags = 0) =>
    sortUnions.type(normalize(checker.typeToString(type, undefined, flags | extraFlags)));
  const signatureToString = (signature) =>
    sortUnions.signature(normalize(checker.signatureToString(signature, undefined, flags)));

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

  // How a named type is printed:
  // - `full`: its body (an alias prints what it resolves to), members, call signatures and index
  //   signatures;
  // - `declaration`: a generic type, as declared. The body of a generic alias is not expanded: strict
  //   types gate inside alias bodies, and only what they resolve to must not change;
  // - `digest`: an instantiation of a generic type, printed by name (its type arguments) and the
  //   SHA-1 of its `full` print. Printing each instantiation in full takes hundreds of megabytes
  //   for the document filters; `--baseline <checkout> --out <dir>` keeps the full prints of both
  //   checkouts in `<dir>/full/{baseline,head}/`.
  // Instantiations whose type arguments still hold type parameters (the deferred types of generic
  // signatures) are not printed: their declaration is walked instead.
  const genericFlags =
    ts.TypeFlags.TypeParameter |
    ts.TypeFlags.Conditional |
    ts.TypeFlags.IndexedAccess |
    ts.TypeFlags.Index |
    ts.TypeFlags.Substitution;

  const isGeneric = (type, seen = new Set()) => {
    if (seen.has(type) === true) return false;
    seen.add(type);

    if ((type.flags & genericFlags) !== 0) return true;
    if (type.isUnionOrIntersection() === true && type.types.some((t) => isGeneric(t, seen))) {
      return true;
    }
    if (type.aliasTypeArguments?.some((t) => isGeneric(t, seen)) === true) return true;

    return referenceArguments(type)?.some((t) => isGeneric(t, seen)) === true;
  };

  // Records `type` under `name`, printed in `mode`. Returns false when `name` is excluded.
  const record = (name, type, mode) => {
    if (exclude.has(name) === true) return false;

    if (named.has(name) === false && named.size < MAX_NAMED_TYPES) {
      named.set(name, { type, mode });
      queue.push(type);
    }

    return true;
  };

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
      const typeArguments =
        type.aliasSymbol === undefined ? referenceArguments(type) : type.aliasTypeArguments;

      if (typeArguments === undefined || typeArguments.length === 0) {
        if (record(symbolName(symbol), type, 'full') === false) return;
      } else {
        const declared = checker.getDeclaredTypeOfSymbol(symbol);
        const parameters = (declaration.typeParameters ?? []).map((p) => p.name.text);
        const declaredName = `${symbolName(symbol)}<${parameters.join(', ')}>`;

        if (record(declaredName, declared, 'declaration') === false) return;

        // The declaration itself, or a deferred instantiation, which the declaration stands for.
        if (typeArguments.some((typeArgument) => isGeneric(typeArgument)) === true) {
          if (type !== declared) return;
        } else {
          const name = `${symbolName(symbol)}<${typeArguments.map((t) => typeToString(t)).join(', ')}>`;

          if (record(name, type, 'digest') === false) return;
        }
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

  const describe = (type, mode = 'full') => {
    // `InTypeAlias` prints the body of an alias instead of its name.
    const lines = [
      `  = ${typeToString(type, mode === 'full' ? ts.TypeFormatFlags.InTypeAlias : 0)}`,
    ];

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
      lines.push(`  call ${signatureToString(signature)}`);
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
  const fullOutput = [];
  // Symbol-keyed members print with a program-specific id (`__@iterator@162`).
  const finish = (text) => normalize(text).replace(/(__@\w+)@\d+/g, '$1');

  for (const statement of surface.statements) {
    if (ts.isTypeAliasDeclaration(statement) === false) continue;

    const type = checker.getTypeAtLocation(statement.name);

    const lines = describe(type);

    output.push(`probe ${statement.name.text}`, ...lines, '');
    fullOutput.push(`probe ${statement.name.text}`, ...lines, '');
    visit(type);
  }

  while (queue.length > 0) visit(queue.shift());

  const names = [...named.keys()].sort();

  for (const name of names) {
    const { type, mode } = named.get(name);

    if (mode === 'digest') {
      const lines = describe(type).map(finish);
      const digest = crypto.createHash('sha1').update(lines.join('\n')).digest('hex');

      output.push(`type ${name}`, `  sha1 ${digest}`, '');
      fullOutput.push(`type ${name}`, ...lines, '');
    } else {
      const lines = describe(type, mode);

      output.push(`type ${name}`, ...lines, '');
      fullOutput.push(`type ${name}`, ...lines, '');
    }
  }

  if (named.size >= MAX_NAMED_TYPES) output.push(`(stopped after ${MAX_NAMED_TYPES} named types)`);

  return {
    text: finish(output.join('\n')),
    fullText: finish(fullOutput.join('\n')),
    names: new Set(names),
  };
}

function dumpSurfaces(ts, program, checkout, app) {
  const core = dumpSurface(ts, program, checkout, app, 'surface-core');
  const providers = dumpSurface(ts, program, checkout, app, 'surface-providers', core.names);

  return {
    outputs: { 'surface-core.txt': core.text, 'surface-providers.txt': providers.text },
    fullOutputs: { 'surface-core.txt': core.fullText, 'surface-providers.txt': providers.fullText },
  };
}

function collect(checkout, label) {
  const { directory, app } = prepare(checkout, label);

  try {
    const generated = generateTypes(checkout, app);
    const ts = require(require.resolve('typescript', { paths: [checkout] }));
    const program = createProgram(ts, app);
    const surfaces = dumpSurfaces(ts, program, checkout, app);

    return {
      directory,
      fullOutputs: surfaces.fullOutputs,
      outputs: {
        ...Object.fromEntries(
          Object.entries(generated).map(([name, content]) => [`generated/${name}`, content])
        ),
        'diagnostics.txt': formatDiagnostics(ts, program, checkout, app),
        'equivalence.txt': formatDiagnostics(
          ts,
          createProgram(ts, app, equivalenceFiles(app)),
          checkout,
          app
        ),
        ...surfaces.outputs,
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

  // `diff` exits with 2 on trouble, e.g. a missing directory, and prints nothing on stdout then.
  assert.notEqual(result.status, 2, `diff failed:\n${result.stderr}`);

  return result.stdout;
}

// Diffs a committed baseline file with the text the head checkout printed.
function diffFile(baselineFile, headText) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'strict-off-parity-diff-'));
  const headFile = path.join(directory, path.basename(baselineFile));

  try {
    fs.writeFileSync(headFile, headText);

    const result = childProcess.spawnSync(
      'diff',
      ['-u', '--label', 'baseline', '--label', 'head', baselineFile, headFile],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 * 256 }
    );

    assert.notEqual(result.status, 2, `diff failed:\n${result.stderr}`);

    return result.stdout;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function writeSurfaceBaseline() {
  const { outputs } = collect(path.resolve(options.baseline), 'baseline');

  writeOutputs(
    SURFACE_BASELINE,
    Object.fromEntries(Object.entries(SURFACES).map(([name, file]) => [file, outputs[name]]))
  );
  console.log(`Updated the surface baseline in ${SURFACE_BASELINE}`);
}

function compareCheckouts() {
  const baseline = collect(path.resolve(options.baseline), 'baseline');
  const head = collect(path.resolve(options.head), 'head');
  const out = options.out ?? fs.mkdtempSync(path.join(os.tmpdir(), 'strict-off-parity-out-'));

  writeOutputs(path.join(out, 'baseline'), baseline.outputs);
  writeOutputs(path.join(out, 'head'), head.outputs);
  writeOutputs(path.join(out, 'full/baseline'), baseline.fullOutputs);
  writeOutputs(path.join(out, 'full/head'), head.fullOutputs);

  const changes = diff(path.join(out, 'baseline'), path.join(out, 'head'));

  fs.writeFileSync(path.join(out, 'parity.diff'), changes);

  const files = Object.keys({ ...baseline.outputs, ...head.outputs }).sort();
  let broken = false;

  for (const file of files) {
    const equal = baseline.outputs[file] === head.outputs[file];
    const informational = INFORMATIONAL.has(file);

    if (equal === false && informational === false) broken = true;

    console.log(`${equal ? 'same' : 'DIFF'} ${file}${informational ? ' (informational)' : ''}`);
  }

  if (broken === false) {
    console.log(
      changes === ''
        ? 'Strict-off parity holds.'
        : `Strict-off parity holds, review the provider differences in ${path.join(out, 'parity.diff')}`
    );
    if (options.out === undefined && changes === '')
      fs.rmSync(out, { recursive: true, force: true });
  } else {
    console.log(`Strict-off parity broken, see ${path.join(out, 'parity.diff')}`);
    process.exitCode = 1;
  }
}

function checkSnapshot() {
  const snapshot = path.resolve(options.snapshot);
  const { outputs } = collect(path.resolve(options.head), 'head');
  const generated = Object.fromEntries(
    Object.entries(outputs)
      .filter(([name]) => name.startsWith('generated/'))
      .map(([name, content]) => [name.slice('generated/'.length), content])
  );
  const failures = [];

  if (options.update === true) {
    fs.rmSync(snapshot, { recursive: true, force: true });
    writeOutputs(snapshot, generated);
    console.log(`Updated the type generation snapshot in ${snapshot}`);
  } else if (fs.existsSync(snapshot) === false) {
    failures.push(
      `Missing type generation snapshot ${snapshot}, create it with \`${UPDATE_COMMAND}\`.`
    );
  } else {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'strict-off-parity-generated-'));

    writeOutputs(out, generated);

    const changes = diff(snapshot, out);

    fs.rmSync(out, { recursive: true, force: true });

    if (changes !== '') {
      failures.push(
        `Type generation output differs from the snapshot in ${snapshot}:\n${changes}\n` +
          `If the change is intended (e.g. develop changed type generation), refresh the snapshot ` +
          `with \`${UPDATE_COMMAND}\` and commit it.`
      );
    }
  }

  for (const [name, file] of Object.entries(SURFACES)) {
    const baselineFile = path.join(SURFACE_BASELINE, file);

    if (fs.existsSync(baselineFile) === false) {
      failures.push(
        `Missing surface baseline ${baselineFile}, create it with \`${SURFACE_UPDATE_COMMAND}\`.`
      );
      continue;
    }

    const changes = diffFile(baselineFile, outputs[name]);

    if (changes === '') continue;

    if (INFORMATIONAL.has(name) === true) {
      console.log(
        `Provider types differ from ${baselineFile} (informational, they may only widen):\n${changes}`
      );
    } else {
      failures.push(
        `The strict-off surface of @strapi/strapi and @strapi/types differs from ${baselineFile}:\n` +
          `${changes}\nWith strict types off these types must print as on develop. If the baseline is ` +
          `stale (the branch was rebased on develop), regenerate it from the merge base with ` +
          `\`${SURFACE_UPDATE_COMMAND}\` and commit it.`
      );
    }
  }

  for (const name of ['diagnostics.txt', 'equivalence.txt']) {
    if (outputs[name] !== '') {
      failures.push(
        `The strict-off ${name.replace('.txt', '')} program has errors:\n${outputs[name]}`
      );
    }
  }

  if (failures.length === 0) {
    console.log('Strict-off snapshot holds.');
  } else {
    console.error(failures.join('\n\n'));
    process.exitCode = 1;
  }
}

if (options.snapshot !== undefined) checkSnapshot();
else if (options.update === true) writeSurfaceBaseline();
else compareCheckouts();
