'use strict';

/**
 * Lists every `any` that an application with strict types reads in the registered contracts, and
 * compares the list with `known-any.json`.
 *
 * The program is an application: it reads the published declarations (`dist`, build first), loads
 * `@strapi/strapi/strict-types` and the server entries of the official plugins that `strapi` does
 * not bundle. It runs once per license scope:
 * - `licensed`: `Settings.licenses: 'declared'` and every licensed feature listed (EE shapes);
 * - `unknown`: no license marker (CE shapes, licensed members optional).
 *
 * Roots: each member of the service and controller entries, each entry of the other registries
 * (discovered from `Strapi.Registries`), and the core API types in `CORE_ROOTS`.
 * The walk follows members, call parameters and results, index signatures, and the items of
 * arrays, promises, maps and sets. A type is skipped only while it is on the current path (cycles),
 * so every route to an `any` is reported. It does not enter a nested `Core.Strapi`, TypeScript lib
 * types or third-party types. TypeScript's error type (an unresolved type) is reported as `<error>`.
 *
 * Declarations are emitted without strict types, so an inferred result that contains a
 * `Core.IsStrict` gate prints as its strict-off side, `any`. Only a scan of `dist` sees it.
 *
 * usage: node tests/types/contract-any/check.cjs [--update] [--print] [--list <file>]
 *   default   compare with the list, exit 1 on a difference
 *   --update  rewrite the list: keep the reasons of rows still found, add new rows without a reason
 *   --print   print the rows found and exit 0
 */

const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');
const ts = require('typescript');

const REPOSITORY = path.resolve(__dirname, '../../..');
const LIST = path.join(__dirname, 'known-any.json');
const UPDATE_COMMAND = 'yarn build && node tests/types/contract-any/check.cjs --update';

/** Levels walked below a registry member or entry. */
const DEPTH = 6;
const MEMBER_REGISTRIES = new Set(['PackageServices', 'PackageControllers']);
/** Registries that hold application input or switches, not package contracts. */
const SKIPPED_REGISTRIES = new Set(['Settings', 'LicensedFeatures', 'LicenseFeatures']);
/**
 * Levels walked in the core API, counting the `Core.Strapi` member: below that, the
 * `@strapi/database` query engine adds hundreds of develop `any`.
 */
const STRAPI_DEPTH = 3;
/**
 * Registries of the core API: `strapi.get(name)` reads the same types as the `strapi.*` getters.
 * Their entries are walked as deep as `Core.Strapi` members.
 */
const CORE_REGISTRIES = new Set(['ContainerEntries']);
/** Core API types an application reads directly. `Core.Strapi` is walked member by member. */
const CORE_ROOTS = [
  { alias: '__Core0', name: 'Core.Strapi', members: true, depth: STRAPI_DEPTH },
  { alias: '__Core1', name: 'Core.MiddlewareHandler', members: false, depth: DEPTH },
  { alias: '__Core2', name: 'Core.ControllerHandler', members: false, depth: DEPTH },
  { alias: '__Core3', name: 'Core.PolicyHandler', members: false, depth: DEPTH },
];
const FEATURES = [
  'licensed',
  'sso',
  'audit-logs',
  'review-workflows',
  'cms-content-releases',
  'cms-content-history',
];
const PLUGINS = [
  '@strapi/plugin-graphql/strapi-server',
  '@strapi/plugin-documentation/strapi-server',
  '@strapi/plugin-sentry/strapi-server',
  '@strapi/plugin-users-permissions/strapi-server',
];
const SCOPES = {
  licensed: [
    'declare global { namespace Strapi { namespace Registries {',
    "  interface Settings { licenses: 'declared' }",
    `  interface LicensedFeatures { ${FEATURES.map((f) => `'${f}': true;`).join(' ')} }`,
    '} } }',
  ],
  unknown: [],
};
/** The options of `tests/types/registries/consumer.test.cjs`, Bundler resolution. */
const OPTIONS = {
  noEmit: true,
  strict: true,
  noUncheckedIndexedAccess: true,
  exactOptionalPropertyTypes: true,
  esModuleInterop: true,
  resolveJsonModule: true,
  skipLibCheck: true,
  types: [],
  target: ts.ScriptTarget.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ESNext,
};
const ITEM_CONTAINERS = new Set([
  'Promise',
  'Array',
  'ReadonlyArray',
  'Map',
  'ReadonlyMap',
  'Set',
  'ReadonlySet',
]);
/** Lib aliases that map the caller's own types: walked. */
const LIB_MAPPERS = new Set(['Record', 'Partial', 'Pick', 'Omit', 'Required', 'Readonly']);

// Type flags are bit fields.
// eslint-disable-next-line no-bitwise
const hasFlag = (value, flag) => (value & flag) !== 0;
const isAny = (type) => hasFlag(type.flags, ts.TypeFlags.Any);
// An unresolved type also has the `Any` flag.
const isErrorType = (type) =>
  isAny(type) && (type.intrinsicName === 'error' || type.intrinsicName === 'unresolved');
const declarationOf = (symbol) => symbol.valueDeclaration ?? symbol.declarations?.[0];
const fileOfType = (type) =>
  declarationOf(type.aliasSymbol ?? type.symbol ?? { declarations: [] })?.getSourceFile().fileName;
const isPrivateName = (symbol) => {
  const declaration = declarationOf(symbol);
  return (
    declaration !== undefined &&
    declaration.name !== undefined &&
    ts.isPrivateIdentifier(declaration.name)
  );
};

/** TypeScript lib or third-party declarations, which use `any` of their own. */
const isLibraryType = (type) => {
  if (type.aliasSymbol !== undefined && LIB_MAPPERS.has(type.aliasSymbol.name)) {
    return false;
  }
  const file = fileOfType(type);
  if (file === undefined) {
    return false;
  }
  const relative = path.relative(REPOSITORY, file).split(path.sep).join('/');
  return (
    relative.includes('/typescript/lib/') ||
    (relative.includes('node_modules/') && relative.includes('node_modules/@strapi/') === false)
  );
};

/** `Core.Strapi`, from `@strapi/types` sources or declarations. */
const isStrapiType = (type) => {
  const symbol = type.symbol ?? type.aliasSymbol;
  return (
    symbol?.name === 'Strapi' &&
    /types\/(src|dist)\/core\/strapi\.(d\.)?ts$/.test(fileOfType(type) ?? '')
  );
};

/**
 * Returns `walk(type, depth, site)`, which lists the `any` paths of `type` as `{ path, site }`.
 * `site` is the declaration of the last named segment (member, parameter, signature).
 * `isStop(type)` names the types the walk does not enter (a nested `Core.Strapi`).
 */
function createWalker(checker, { isStop = () => false } = {}) {
  const onPath = new Set();
  const prefix = (segment, found) =>
    found.map((f) => ({ ...f, path: f.path === '' ? segment : `${segment}.${f.path}` }));

  function walk(type, depth, site) {
    if (isAny(type)) {
      return [{ path: isErrorType(type) ? '<error>' : '', site }];
    }
    if (depth <= 0 || onPath.has(type) || isStop(type)) {
      return [];
    }
    onPath.add(type);
    try {
      if (type.isUnionOrIntersection()) {
        return type.types.flatMap((member) => walk(member, depth, site));
      }
      if (hasFlag(type.flags, ts.TypeFlags.Object) === false) {
        return [];
      }
      const found = [];
      const reference = hasFlag(type.objectFlags, ts.ObjectFlags.Reference);
      const typeArguments = reference ? checker.getTypeArguments(type) : [];
      const name = type.symbol?.name;
      if (typeArguments.length > 0 && ITEM_CONTAINERS.has(name)) {
        typeArguments.forEach((argument, index) => {
          const segment = `${name.replace('Readonly', '')}<${index}>`;
          found.push(...prefix(segment, walk(argument, depth - 1, site)));
        });
        return found;
      }
      if (isLibraryType(type)) {
        return found;
      }
      for (const info of checker.getIndexInfosOfType(type)) {
        found.push(...prefix('[index]', walk(info.type, depth - 1, info.declaration ?? site)));
      }
      for (const signature of [...type.getCallSignatures(), ...type.getConstructSignatures()]) {
        for (const parameter of signature.getParameters()) {
          const parameterType = checker.getTypeOfSymbol(parameter);
          const parameterSite = declarationOf(parameter);
          found.push(
            ...prefix(`(${parameter.name})`, walk(parameterType, depth - 1, parameterSite))
          );
        }
        const resultSite = signature.getDeclaration() ?? site;
        found.push(...prefix('=>', walk(signature.getReturnType(), depth - 1, resultSite)));
      }
      for (const property of type.getProperties()) {
        // ES private names print as `#private` in declarations, with no type.
        if (isPrivateName(property)) {
          continue;
        }
        const propertyType = checker.getTypeOfSymbol(property);
        found.push(
          ...prefix(property.name, walk(propertyType, depth - 1, declarationOf(property)))
        );
      }
      return found;
    } finally {
      onPath.delete(type);
    }
  }

  return walk;
}

/** A program over in-memory files (`{ [absolute path]: text }`), with the disk for the rest. */
function createVirtualProgram(files, options) {
  const virtual = new Map(Object.entries(files).map(([file, text]) => [path.resolve(file), text]));
  const host = ts.createCompilerHost(options);
  const { getSourceFile, fileExists, readFile, directoryExists } = host;
  host.getSourceFile = (file, language, ...rest) => {
    const text = virtual.get(path.resolve(file));
    return text === undefined
      ? getSourceFile.call(host, file, language, ...rest)
      : ts.createSourceFile(file, text, language);
  };
  host.fileExists = (file) => virtual.has(path.resolve(file)) || fileExists.call(host, file);
  host.readFile = (file) => virtual.get(path.resolve(file)) ?? readFile.call(host, file);
  host.directoryExists = (directory) =>
    [...virtual.keys()].some((file) => file.startsWith(`${path.resolve(directory)}${path.sep}`)) ||
    directoryExists.call(host, directory);
  // The first file is the root; the others are reached through its imports.
  return ts.createProgram({ rootNames: [Object.keys(files)[0]], options, host });
}

/** Where `declaration` is, `<repository path>:<line>`. */
const siteOf = (declaration) => {
  if (declaration === undefined) {
    return undefined;
  }
  const source = declaration.getSourceFile();
  const line = source.getLineAndCharacterOfPosition(declaration.getStart()).line + 1;
  const relative = path.relative(REPOSITORY, source.fileName).replace(/^node_modules\//, '');
  return `${relative}:${line}`;
};

/**
 * Lists the `any` of one program as rows `{ key, path, site, scope }`. `coreRoots` name the type
 * aliases of the root file that hold the core API types.
 */
function scanProgram({ program, fileName, scope, coreRoots, isStrapiInstance = isStrapiType }) {
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(fileName);
  const walk = createWalker(checker, { isStop: isStrapiInstance });
  const rows = [];
  const add = (key, type, depth) => {
    for (const found of walk(type, depth)) {
      rows.push({ key, path: found.path, site: siteOf(found.site), scope });
    }
  };
  const withoutUndefined = (type) =>
    type.isUnion()
      ? checker.getUnionType(
          type.types.filter((member) => hasFlag(member.flags, ts.TypeFlags.Undefined) === false)
        )
      : type;

  const strapiNamespace = checker
    .getSymbolsInScope(sourceFile, ts.SymbolFlags.Namespace)
    .find((symbol) => symbol.name === 'Strapi');
  if (strapiNamespace === undefined) {
    throw new Error('The program declares no `Strapi` namespace.');
  }
  const registriesNamespace = checker
    .getExportsOfModule(strapiNamespace)
    .find((symbol) => symbol.name === 'Registries');
  const registries = checker
    .getExportsOfModule(registriesNamespace)
    .filter(
      (symbol) =>
        hasFlag(symbol.flags, ts.SymbolFlags.Interface) &&
        SKIPPED_REGISTRIES.has(symbol.name) === false
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const registry of registries) {
    for (const entry of checker.getDeclaredTypeOfSymbol(registry).getProperties()) {
      const entryType = withoutUndefined(checker.getTypeOfSymbol(entry));
      const members = MEMBER_REGISTRIES.has(registry.name) ? entryType.getProperties() : [];
      if (members.length === 0) {
        const depth = CORE_REGISTRIES.has(registry.name) ? STRAPI_DEPTH - 1 : DEPTH;
        add(`${registry.name} ${entry.name} *`, entryType, depth);
      }
      for (const member of members) {
        add(
          `${registry.name} ${entry.name} ${member.name}`,
          checker.getTypeOfSymbol(member),
          DEPTH
        );
      }
    }
  }

  // An `any` declared where a registry row already found one is not listed again under a core
  // root (`strapi.plugins.graphql.services…`).
  const registrySites = new Set(rows.map((row) => row.site).filter((site) => site !== undefined));
  const registryRows = rows.length;
  for (const root of coreRoots) {
    const statement = sourceFile.statements.find(
      (s) => ts.isTypeAliasDeclaration(s) && s.name.text === root.alias
    );
    const type = checker.getTypeAtLocation(statement.name);
    if (root.members === false) {
      add(`${root.name} *`, type, root.depth);
      continue;
    }
    // Member by member, so a nested `Core.Strapi` (`load(): Promise<Strapi>`) stops the walk.
    for (const member of type.getProperties()) {
      if (isPrivateName(member) === false) {
        add(`${root.name} ${member.name}`, checker.getTypeOfSymbol(member), root.depth - 1);
      }
    }
  }
  const coreRows = rows
    .splice(registryRows)
    .filter((row) => row.site === undefined || registrySites.has(row.site) === false);
  return [...rows, ...coreRows];
}

/** The application program of one license scope. */
function scanScope(scope) {
  const fileName = path.join(__dirname, '__contract_any__.ts');
  const text = [
    '/// <reference types="@strapi/strapi/strict-types" />',
    ...PLUGINS.map((plugin) => `import type {} from '${plugin}';`),
    "import type { Core } from '@strapi/strapi';",
    ...SCOPES[scope],
    ...CORE_ROOTS.map((root) => `export type ${root.alias} = ${root.name};`),
  ].join('\n');
  const program = createVirtualProgram({ [fileName]: text }, OPTIONS);
  const diagnostics = ts.getPreEmitDiagnostics(program, program.getSourceFile(fileName));
  if (diagnostics.length > 0) {
    const messages = diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
    throw new Error(`The ${scope} application program does not compile:\n${messages.join('\n')}`);
  }
  return scanProgram({ program, fileName, scope, coreRoots: CORE_ROOTS });
}

/** Groups rows by key: `{ [key]: { paths, sites, scopes } }`, sorted. */
function collect(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const member = byKey.get(row.key) ?? { paths: new Set(), sites: new Set(), scopes: new Set() };
    member.paths.add(row.path);
    if (row.site !== undefined) {
      member.sites.add(row.site);
    }
    member.scopes.add(row.scope);
    byKey.set(row.key, member);
  }
  const sorted = [...byKey.entries()].sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(
    sorted.map(([key, member]) => [
      key,
      {
        paths: [...member.paths].sort(),
        sites: [...member.sites].sort(),
        scopes: [...member.scopes],
      },
    ])
  );
}

const printPath = (p) => (p === '' ? '(the member itself)' : p);

/**
 * The differences between the members found and the list, as `{ kind, text }`. Kinds: `new` (a
 * path the list does not have), `gone` (a listed path that is no longer `any`), `reason` (a listed
 * member without a reason).
 */
function compare(found, list, { describeSite = (site) => site } = {}) {
  const problems = [];
  for (const [key, member] of Object.entries(found)) {
    const listed = list.members[key];
    const sites = member.sites.slice(0, 3).map(describeSite).join(', ');
    const paths =
      listed === undefined
        ? member.paths
        : member.paths.filter((p) => listed.paths.includes(p) === false);
    for (const p of paths) {
      problems.push({
        kind: 'new',
        error: p.endsWith('<error>'),
        text: `NEW any: ${key}  path: ${printPath(p)}  [${member.scopes.join(', ')}]\n    declared at ${sites === '' ? 'an unknown site' : sites}`,
      });
    }
  }
  for (const [key, listed] of Object.entries(list.members)) {
    const paths = found[key]?.paths ?? [];
    for (const p of listed.paths.filter((x) => paths.includes(x) === false)) {
      problems.push({
        kind: 'gone',
        text: `GONE: ${key}  path: ${printPath(p)} is listed but no longer any.`,
      });
    }
    if (typeof listed.reason !== 'string' || listed.reason.trim() === '') {
      problems.push({ kind: 'reason', text: `NO REASON: ${key} is listed without a reason.` });
    }
  }
  return problems;
}

/** The list with the members found: reasons and tracking kept, new members without a reason. */
function updateList(found, list) {
  const members = {};
  for (const [key, member] of Object.entries(found)) {
    const previous = list.members?.[key];
    members[key] = {
      reason: previous?.reason ?? '',
      ...(previous?.tracking === undefined ? {} : { tracking: previous.tracking }),
      paths: member.paths,
    };
  }
  return { ...list, members };
}

/** The list as `yarn prettier:check` expects it (short arrays on one line). */
async function formatList(list, file) {
  const prettier = require('prettier');
  const config = await prettier.resolveConfig(file);
  return prettier.format(JSON.stringify(list), { ...config, parser: 'json' });
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** The values of one base64 VLQ source map segment. */
function decodeSegment(segment) {
  const values = [];
  let value = 0;
  let shift = 0;
  for (const char of segment) {
    const digit = BASE64.indexOf(char);
    /* eslint-disable no-bitwise */
    value += (digit & 31) << shift;
    if ((digit & 32) === 0) {
      values.push((value & 1) === 1 ? -(value >>> 1) : value >>> 1);
      value = 0;
      shift = 0;
    } else {
      shift += 5;
    }
    /* eslint-enable no-bitwise */
  }
  return values;
}

const sourceMaps = new Map();

/**
 * The source line of line `line` (1-based) of an emitted declaration, through its `.d.ts.map`:
 * `{ file, line }`, or `undefined` without a map.
 */
function sourceLineOf(declarationFile, line) {
  if (sourceMaps.has(declarationFile) === false) {
    const mapFile = `${declarationFile}.map`;
    let lines;
    if (fs.existsSync(mapFile)) {
      const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
      const sourceRoot = path.resolve(path.dirname(mapFile), map.sourceRoot ?? '');
      // Source index and line are relative to the previous segment, across lines.
      let source = 0;
      let sourceLine = 0;
      lines = map.mappings.split(';').map((segments) => {
        let first;
        for (const segment of segments.split(',')) {
          const values = segment === '' ? [] : decodeSegment(segment);
          if (values.length >= 4) {
            source += values[1];
            sourceLine += values[2];
            first = first ?? {
              file: path.resolve(sourceRoot, map.sources[source]),
              line: sourceLine + 1,
            };
          }
        }
        return first;
      });
    }
    sourceMaps.set(declarationFile, lines);
  }
  return sourceMaps.get(declarationFile)?.[line - 1];
}

/** `<source>:<line> (<dist site>)` when the declaration map names a source. */
const describeSite = (site) => {
  const match = /^(.*\.d\.ts):(\d+)$/.exec(site);
  if (match === null) {
    return site;
  }
  const source = sourceLineOf(path.join(REPOSITORY, match[1]), Number(match[2]));
  return source === undefined
    ? site
    : `${path.relative(REPOSITORY, source.file)}:${source.line} (${site})`;
};

const HINTS = {
  new: 'NEW: an application with strict types reads `any` there. Type it, and keep the strict-off output unchanged with `Core.IsStrict extends true ? <type> : <previous type>` written out: an inferred result resolves the gate to its strict-off side in `dist`. If the `any` must stay, run the update command and write a reason.',
  error:
    '<error>: an unresolved type in a published declaration (a missing dependency or a broken import). `skipLibCheck` hides it.',
  gone: 'GONE: the `any` is fixed. Run the update command to drop it from the list.',
  reason: 'NO REASON: write why the `any` stays, and a tracking issue when there is one.',
};

const report = (text) => {
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary !== undefined && summary !== '') {
    fs.appendFileSync(
      summary,
      `### Registered contracts without new any\n\n\`\`\`text\n${text}\n\`\`\`\n`
    );
  }
};

async function main() {
  const { values: args } = parseArgs({
    options: {
      update: { type: 'boolean', default: false },
      print: { type: 'boolean', default: false },
      list: { type: 'string', default: LIST },
    },
  });
  const started = process.hrtime.bigint();
  const found = collect(Object.keys(SCOPES).flatMap((scope) => scanScope(scope)));
  const seconds = Number(process.hrtime.bigint() - started) / 1e9;
  const pathCount = Object.values(found).reduce((sum, member) => sum + member.paths.length, 0);
  console.error(
    `Scanned ${Object.keys(SCOPES).join(' and ')} scopes in ${seconds.toFixed(1)} s: ${pathCount} paths in ${Object.keys(found).length} members.`
  );

  if (args.print === true) {
    for (const [key, member] of Object.entries(found)) {
      console.log(`${key}  [${member.scopes.join(', ')}]`);
      member.paths.forEach((p) => console.log(`    ${printPath(p)}`));
      console.log(`    at ${member.sites.slice(0, 3).map(describeSite).join(', ')}`);
    }
    return 0;
  }

  const relativeList = path.relative(REPOSITORY, args.list);
  const list = fs.existsSync(args.list)
    ? JSON.parse(fs.readFileSync(args.list, 'utf8'))
    : { members: {} };

  if (args.update === true) {
    const updated = updateList(found, list);
    fs.writeFileSync(args.list, await formatList(updated, args.list));
    console.log(`Updated ${relativeList}: ${Object.keys(updated.members).length} members.`);
    const missing = Object.entries(updated.members).filter(([, m]) => m.reason.trim() === '');
    if (missing.length > 0) {
      console.log(`Write a "reason" for:\n  ${missing.map(([key]) => key).join('\n  ')}`);
    }
    return 0;
  }

  const problems = compare(found, list, { describeSite });
  if (problems.length === 0) {
    const text = `Registered contracts match ${relativeList}: ${Object.keys(found).length} members with a known any.`;
    console.log(text);
    report(text);
    return 0;
  }
  const kinds = new Set(problems.map((p) => p.kind));
  if (problems.some((p) => p.error === true)) {
    kinds.add('error');
  }
  const text = [
    ...problems.map((p) => p.text),
    '',
    `The registered contracts do not match ${relativeList}.`,
    ...['new', 'error', 'gone', 'reason'].filter((k) => kinds.has(k)).map((k) => `- ${HINTS[k]}`),
    `Update command: ${UPDATE_COMMAND}`,
  ].join('\n');
  console.error(`\n${text}`);
  report(text);
  return 1;
}

module.exports = {
  collect,
  compare,
  createVirtualProgram,
  createWalker,
  formatList,
  scanProgram,
  sourceLineOf,
  updateList,
};

if (require.main === module) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error);
      process.exitCode = 1;
    }
  );
}
