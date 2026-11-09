import type * as TS from 'typescript';

import type { CodeFinding } from '../../../../shared/contracts/migration';
import { UP_CONFIG_MAP } from '../../compat/config-map';

type Typescript = typeof TS;

export interface UsersPermissionsSettings {
  /** `strapi.config.get('plugin::users-permissions')`, never printed as it is */
  config: Record<string, unknown>;
  /** `config.jwtSecret === process.env.JWT_SECRET` */
  jwtSecretFromEnv: boolean;
  /** From the grant store */
  callbacks: Record<string, string> | null;
}

export interface ConfigBlockOptions {
  /** The path the findings name, `config/plugins` by default */
  path?: string;
  /** A `config/env/<name>/plugins` file: only the keys it holds, no `migration`, `secret` or `usersPermissions` */
  environment?: boolean;
  /**
   * For a block that is shown rather than written: a secret never takes the project's text, whatever
   * the expression (a literal, an `env()` call with a fallback), but is read from the environment
   */
  redactSecrets?: boolean;
}

/** The change to Users & Permissions, for a project that edits its `config/plugins` by hand */
export const USERS_PERMISSIONS_LINE =
  "'users-permissions': { enabled: false /* keep its config as it is */ },";

const DEFAULT_PATH = 'config/plugins';
const END_USERS_KEY = 'end-users';
const USERS_PERMISSIONS_KEY = 'users-permissions';
const SECRET_CALL = "env('END_USERS_SECRET')";
const JWT_SECRET_CALL = "env('JWT_SECRET')";

/** Loaded on first use, so a start that plans no files never pays for the parser */
const loadTypescript = async (): Promise<Typescript> => {
  const loaded = (await import('typescript')) as Typescript & { default?: Typescript };

  return loaded.default ?? loaded;
};

/* ------------------------------------------------------------------------------------------------
 * Rendering
 * ----------------------------------------------------------------------------------------------*/

interface Tree {
  [key: string]: string | Tree;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const quote = (value: string) =>
  `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;

const keyText = (key: string) => (IDENTIFIER.test(key) ? key : quote(key));

/** A JS literal for a plain value, or `undefined` for what has none (functions, symbols) */
const literal = (value: unknown): string | undefined => {
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null) return 'null';

  if (Array.isArray(value)) {
    const items = value.map(literal);

    return items.every((item) => item !== undefined) ? `[${items.join(', ')}]` : undefined;
  }

  if (typeof value === 'object' && value !== undefined) {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, item]) => [key, literal(item)] as const
    );

    if (entries.some(([, item]) => item === undefined)) return undefined;

    return entries.length === 0
      ? '{}'
      : `{ ${entries.map(([key, item]) => `${keyText(key)}: ${item}`).join(', ')} }`;
  }

  return undefined;
};

const render = (tree: Tree, depth: number): string => {
  const inner = '  '.repeat(depth + 1);
  const lines = Object.entries(tree).map(
    ([key, value]) =>
      `${inner}${keyText(key)}: ${typeof value === 'string' ? value : render(value, depth + 1)},`
  );

  return lines.length === 0 ? '{}' : `{\n${lines.join('\n')}\n${'  '.repeat(depth)}}`;
};

const setIn = (tree: Tree, path: string[], value: string | Tree) => {
  let node = tree;

  for (const part of path.slice(0, -1)) {
    const next = node[part];

    if (typeof next === 'object') {
      node = next;
    } else {
      const created: Tree = {};
      node[part] = created;
      node = created;
    }
  }

  node[path[path.length - 1]] = value;
};

const isEmptyTree = (tree: Tree): boolean =>
  Object.values(tree).every((value) => typeof value === 'object' && isEmptyTree(value));

/** Drops the groups nothing was set in, so a block holds no empty `{}` the project did not write */
const prune = (tree: Tree): Tree => {
  const out: Tree = {};

  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'string') {
      out[key] = value;
    } else if (!isEmptyTree(value)) {
      out[key] = prune(value);
    }
  }

  return out;
};

/* ------------------------------------------------------------------------------------------------
 * Reading U&P's settings: from the project's file when it parses, else from the live config
 * ----------------------------------------------------------------------------------------------*/

interface Entry {
  /** The value as it is written: the source's own text, or a literal built from the live value */
  text: string;
  /** The value when it is a plain literal, else `undefined` */
  value: unknown;
  line: number | null;
  /** Where it was read: only text written in the project's file may stand for a secret */
  origin: 'source' | 'live';
}

type Entries = Map<string, Entry>;

/** U&P settings that are in its own defaults: a live config always holds them, so they are not news */
const LIVE_DEFAULT_KEYS = new Set([
  'layout',
  'sessions.accessTokenLifespan',
  'callback.validate',
  'jwtManagement',
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Flat dotted keys; recursion stops at the keys the map knows */
const flattenLive = (config: Record<string, unknown>): Entries => {
  const entries: Entries = new Map();

  const walk = (value: Record<string, unknown>, prefix: string) => {
    for (const [key, item] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const known = Object.hasOwn(UP_CONFIG_MAP, path) && path !== 'jwt';

      if (isPlainObject(item) && !known) {
        walk(item, path);
      } else if (typeof item === 'function') {
        entries.set(path, { text: '', value: item, line: null, origin: 'live' });
      } else if (item !== undefined) {
        // a secret is never turned into text from the live config
        const secret = /secret/i.test(path);

        entries.set(path, {
          text: secret ? '' : (literal(item) ?? ''),
          value: secret ? undefined : item,
          line: null,
          origin: 'live',
        });
      }
    }
  };

  walk(config, '');

  return entries;
};

const nameOf = (ts: Typescript, name: TS.PropertyName): string | null =>
  ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)
    ? name.text
    : null;

const unwrap = (ts: Typescript, node: TS.Expression): TS.Expression => {
  let current = node;

  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }

  return current;
};

/** The value of a plain literal node, else `undefined` */
const literalValue = (ts: Typescript, node: TS.Expression): unknown => {
  const inner = unwrap(ts, node);

  if (ts.isStringLiteral(inner) || ts.isNoSubstitutionTemplateLiteral(inner)) return inner.text;
  if (ts.isNumericLiteral(inner)) return Number(inner.text);
  if (inner.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (inner.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (inner.kind === ts.SyntaxKind.NullKeyword) return null;

  if (
    ts.isPrefixUnaryExpression(inner) &&
    inner.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(inner.operand)
  ) {
    return -Number(inner.operand.text);
  }

  if (ts.isArrayLiteralExpression(inner)) {
    const items = inner.elements.map((element) => literalValue(ts, element));

    return items.every((item) => item !== undefined) ? items : undefined;
  }

  return undefined;
};

const lineOfNode = (ts: Typescript, sf: TS.SourceFile, node: TS.Node) =>
  ts.getLineAndCharacterOfPosition(sf, node.getStart(sf)).line + 1;

interface SourceConfig {
  entries: Entries;
  /** The config holds a spread, so a key that is absent here may still be set */
  opaque: boolean;
}

const flattenSource = (
  ts: Typescript,
  sf: TS.SourceFile,
  config: TS.ObjectLiteralExpression
): SourceConfig => {
  const entries: Entries = new Map();
  let opaque = false;

  const walk = (object: TS.ObjectLiteralExpression, prefix: string) => {
    for (const property of object.properties) {
      const named =
        ts.isPropertyAssignment(property) ||
        ts.isMethodDeclaration(property) ||
        ts.isShorthandPropertyAssignment(property);
      const key = named ? nameOf(ts, property.name) : null;

      if (!named || key === null) {
        opaque = true;
        continue;
      }

      if (!ts.isPropertyAssignment(property)) {
        // a method or a shorthand: its text is the value, which is not a plain literal
        entries.set(prefix ? `${prefix}.${key}` : key, {
          text: property.getText(sf),
          value: undefined,
          line: lineOfNode(ts, sf, property),
          origin: 'source',
        });
        continue;
      }

      const path = prefix ? `${prefix}.${key}` : key;
      const value = unwrap(ts, property.initializer);

      if (
        ts.isObjectLiteralExpression(value) &&
        (!Object.hasOwn(UP_CONFIG_MAP, path) || path === 'jwt')
      ) {
        walk(value, path);
      } else {
        entries.set(path, {
          text: property.initializer.getText(sf),
          value: literalValue(ts, property.initializer),
          line: lineOfNode(ts, sf, property),
          origin: 'source',
        });
      }
    }
  };

  walk(config, '');

  return { entries, opaque };
};

/* ------------------------------------------------------------------------------------------------
 * Finding the plugins object in a file
 * ----------------------------------------------------------------------------------------------*/

interface Located {
  plugins: TS.ObjectLiteralExpression;
  /** Splices that put `env` in scope: the file is an object literal, or a function that does not take it */
  scopeEdits: Edit[];
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

type Locate = { ok: true; located: Located } | { ok: false; reason: string };

const exportedExpression = (ts: Typescript, sf: TS.SourceFile): TS.Node | undefined => {
  for (const statement of sf.statements) {
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      return statement.expression;
    }

    if (
      ts.isFunctionDeclaration(statement) &&
      statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
    ) {
      return statement;
    }

    if (
      ts.isExpressionStatement(statement) &&
      ts.isBinaryExpression(statement.expression) &&
      statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      statement.expression.left.getText(sf) === 'module.exports'
    ) {
      return statement.expression.right;
    }
  }

  return undefined;
};

type FunctionLike = TS.ArrowFunction | TS.FunctionExpression | TS.FunctionDeclaration;

/** The object literal a function returns: an arrow's body, or its single top-level `return` */
const returnedObject = (
  ts: Typescript,
  fn: FunctionLike
): TS.ObjectLiteralExpression | undefined => {
  const { body } = fn;

  if (!body) return undefined;

  if (!ts.isBlock(body)) {
    const value = unwrap(ts, body);

    return ts.isObjectLiteralExpression(value) ? value : undefined;
  }

  const returns = body.statements.filter(ts.isReturnStatement);

  if (returns.length !== 1 || !returns[0].expression) return undefined;

  const value = unwrap(ts, returns[0].expression);

  return ts.isObjectLiteralExpression(value) ? value : undefined;
};

/** Splices that make `env` a parameter, or `undefined` when the function's first parameter rules that out */
const envParameterEdits = (
  ts: Typescript,
  sf: TS.SourceFile,
  fn: FunctionLike
): Edit[] | undefined => {
  const [first] = fn.parameters;

  if (!first) {
    const at = fn.parameters.pos;

    return [{ start: at, end: at, text: '{ env }' }];
  }

  if (!ts.isObjectBindingPattern(first.name)) return undefined;

  const { elements } = first.name;
  const named = elements.filter(
    (element) =>
      !element.dotDotDotToken &&
      nameOf(ts, element.propertyName ?? (element.name as TS.PropertyName)) === 'env'
  );

  if (named.length > 0) {
    // `{ env: renamed }` hides it under another name
    return named.some((element) => element.propertyName !== undefined) ? undefined : [];
  }

  if (elements.some((element) => element.dotDotDotToken)) return undefined;

  const at = elements.pos;

  return [{ start: at, end: at, text: elements.length === 0 ? ' env ' : ' env,' }];
};

const locate = (ts: Typescript, sf: TS.SourceFile): Locate => {
  const exported = exportedExpression(ts, sf);

  if (!exported) {
    return { ok: false, reason: 'it has no `export default` or `module.exports` it can follow' };
  }

  const value = ts.isFunctionDeclaration(exported)
    ? exported
    : unwrap(ts, exported as TS.Expression);

  if (ts.isObjectLiteralExpression(value)) {
    return {
      ok: true,
      located: {
        plugins: value,
        scopeEdits: [
          { start: value.getStart(sf), end: value.getStart(sf), text: '({ env }) => (' },
          { start: value.end, end: value.end, text: ')' },
        ],
      },
    };
  }

  if (
    ts.isArrowFunction(value) ||
    ts.isFunctionExpression(value) ||
    ts.isFunctionDeclaration(value)
  ) {
    const plugins = returnedObject(ts, value);

    if (!plugins) {
      return {
        ok: false,
        reason: 'the function does not return one object literal that this can read',
      };
    }

    const scopeEdits = envParameterEdits(ts, sf, value);

    if (!scopeEdits) {
      return { ok: false, reason: 'the function does not destructure `env` from its argument' };
    }

    return { ok: true, located: { plugins, scopeEdits } };
  }

  return { ok: false, reason: 'the export is built from a variable, a call or a spread' };
};

interface NamedProperty {
  name: string;
  property: TS.PropertyAssignment;
}

/** The plugin entries by name, or `null` when something other than `'name': value` is in the object */
const namedProperties = (
  ts: Typescript,
  object: TS.ObjectLiteralExpression
): NamedProperty[] | null => {
  const found: NamedProperty[] = [];

  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) return null;

    const name = nameOf(ts, property.name);

    if (name === null) return null;

    found.push({ name, property });
  }

  return found;
};

/* ------------------------------------------------------------------------------------------------
 * The end-users block
 * ----------------------------------------------------------------------------------------------*/

const findingOf = (
  path: string,
  rule: CodeFinding['rule'],
  message: string,
  line: number | null = null
): CodeFinding => ({ path, line, rule, message });

/** The U&P config object in the project's file, with what is needed to read it */
const readSourceConfig = (ts: Typescript, sf: TS.SourceFile): SourceConfig | 'no-entry' | null => {
  const found = locate(ts, sf);

  if (!found.ok) return null;

  const properties = namedProperties(ts, found.located.plugins);

  if (!properties) return null;

  const entry = properties.find(({ name }) => name === USERS_PERMISSIONS_KEY);

  if (!entry) return 'no-entry';

  const value = unwrap(ts, entry.property.initializer);

  if (!ts.isObjectLiteralExpression(value)) return null;

  const config = namedProperties(ts, value)?.find(({ name }) => name === 'config');

  if (!config) return { entries: new Map(), opaque: false };

  const configValue = unwrap(ts, config.property.initializer);

  return ts.isObjectLiteralExpression(configValue) ? flattenSource(ts, sf, configValue) : null;
};

const parseSource = (ts: Typescript, path: string, source: string): TS.SourceFile =>
  ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    /\.[cm]?ts$/.test(path) ? ts.ScriptKind.TS : ts.ScriptKind.JS
  );

/**
 * The `'end-users'` entry for `config/plugins`: compat settings copied from Users & Permissions',
 * the migration keys, and an `env()` call wherever a secret goes. With `source` the values are
 * copied as written there, so an `env(...)` call stays a call; without it, or when it does not
 * parse, plain values come from the live config and each secret is an `env()` call.
 */
export const endUsersConfigBlock = async (
  settings: UsersPermissionsSettings,
  source: string | null,
  options: ConfigBlockOptions = {}
): Promise<{ block: string; findings: CodeFinding[] }> => {
  const path = options.path ?? DEFAULT_PATH;
  const environment = options.environment === true;
  const findings: CodeFinding[] = [];

  let read: SourceConfig | null = null;

  if (source !== null) {
    const ts = await loadTypescript();
    const parsed = readSourceConfig(ts, parseSource(ts, path, source));

    read = parsed === 'no-entry' ? { entries: new Map(), opaque: false } : parsed;
  }

  const live = environment ? new Map<string, Entry>() : flattenLive(settings.config);
  const fromSource = read !== null;

  /** What the project wrote, falling back to the live config where the file cannot say */
  const get = (key: string): Entry | undefined => {
    const written = read?.entries.get(key);

    if (written || (fromSource && !read?.opaque)) return written;

    return live.get(key);
  };

  const tree: Tree = {};
  const set = (keyPath: string, value: string | undefined) => {
    if (value !== undefined) setIn(tree, keyPath.split('.'), value);
  };

  /* secret */
  if (!environment) {
    set('secret', SECRET_CALL);
    findings.push(
      findingOf(
        path,
        'secret-to-set',
        'Set END_USERS_SECRET in the environment to a long random string before the next start: it signs the new sessions.'
      )
    );
    set('compat.usersPermissions', 'true');
  }

  /* compat.legacyJwt */
  const jwtSecret = get('jwtSecret');

  if (!environment || jwtSecret) {
    if (jwtSecret?.origin === 'source' && jwtSecret.text !== '' && !options.redactSecrets) {
      set('compat.legacyJwt.secret', jwtSecret.text);
    } else {
      if (
        options.redactSecrets &&
        jwtSecret?.origin === 'source' &&
        jwtSecret.text.replace(/\s+/g, '') !== JWT_SECRET_CALL
      ) {
        findings.push(
          findingOf(
            path,
            'legacy-secret',
            'The config writes the legacy JWT secret in the file (a literal, or with a fallback). Read it from the JWT_SECRET environment variable only.',
            jwtSecret.line
          )
        );
      }

      set('compat.legacyJwt.secret', JWT_SECRET_CALL);

      if (!settings.jwtSecretFromEnv) {
        findings.push(
          findingOf(
            path,
            'legacy-secret',
            'Users & Permissions signs its tokens with a secret that is not the JWT_SECRET environment variable. Set JWT_SECRET to that secret, or tokens issued before the move stop working.'
          )
        );
      }
    }
  }

  if (!environment) set('compat.legacyJwt.until', 'null');

  const algorithm = get('jwt.algorithm');

  if (algorithm && algorithm.text !== '') set('compat.legacyJwt.algorithm', algorithm.text);

  /* compat.refresh */
  const management = get('jwtManagement');
  const refreshing = management?.value === 'refresh';

  if (!environment || management) {
    if (management?.value !== undefined || !management) {
      set('compat.refresh.enabled', String(refreshing));
    } else {
      set('compat.refresh.enabled', `(${management.text}) === 'refresh'`);
    }
  }

  for (const key of [
    'httpOnly',
    'cookie.name',
    'cookie.path',
    'cookie.domain',
    'cookie.sameSite',
    'cookie.secure',
    'cookie.maxAge',
  ]) {
    const entry = get(`sessions.${key}`);

    if (entry && entry.text !== '') set(`compat.refresh.${key}`, entry.text);
  }

  /* compat.connect.callbacks */
  if (!environment && settings.callbacks && Object.keys(settings.callbacks).length > 0) {
    set('compat.connect.callbacks', literal(settings.callbacks));
  }

  /* rateLimit */
  const enabled = get('ratelimit.enabled');
  const interval = get('ratelimit.interval');
  const max = get('ratelimit.max');
  const store = get('ratelimit.store');

  if (enabled && enabled.text !== '') set('rateLimit.enabled', enabled.text);

  if (interval && interval.text !== '') {
    // Users & Permissions took milliseconds, the window here is in seconds
    set(
      'rateLimit.window',
      typeof interval.value === 'number'
        ? String(Math.ceil(interval.value / 1000))
        : `Math.ceil((${interval.text}) / 1000)`
    );
  }

  if (max && max.text !== '') set('rateLimit.max', max.text);

  if (store && typeof store.value === 'string') set('rateLimit.storage', store.text);

  /* session */
  const expiry = refreshing
    ? (get('sessions.maxSessionLifespan') ?? get('sessions.maxRefreshTokenLifespan'))
    : get('jwt.expiresIn');
  const renewal = refreshing
    ? (get('sessions.idleSessionLifespan') ?? get('sessions.idleRefreshTokenLifespan'))
    : undefined;

  if (expiry && expiry.text !== '') set('session.expiresIn', expiry.text);

  if (renewal && renewal.text !== '') set('session.updateAge', renewal.text);

  /* migration */
  if (!environment) {
    const allowed = get('register.allowedFields');

    tree.migration = { fromUsersPermissions: 'true' };

    if (allowed && allowed.text !== '')
      setIn(tree, ['migration', 'registrationFields'], allowed.text);
  }

  /* keys with nothing to copy, or nothing to copy it to */
  const handled = new Set([
    'jwtSecret',
    'jwt.expiresIn',
    'jwt.algorithm',
    'jwtManagement',
    'sessions.httpOnly',
    'sessions.cookie.name',
    'sessions.cookie.path',
    'sessions.cookie.domain',
    'sessions.cookie.sameSite',
    'sessions.cookie.secure',
    'sessions.cookie.maxAge',
    'sessions.maxSessionLifespan',
    'sessions.maxRefreshTokenLifespan',
    'sessions.idleSessionLifespan',
    'sessions.idleRefreshTokenLifespan',
    'ratelimit.enabled',
    'ratelimit.interval',
    'ratelimit.max',
    'ratelimit.store',
    'register.allowedFields',
  ]);

  const seen: Entries = fromSource ? new Map(read?.entries) : live;

  for (const [key, entry] of seen) {
    if (handled.has(key)) continue;

    if (!fromSource && LIVE_DEFAULT_KEYS.has(key)) continue;

    const known = Object.hasOwn(UP_CONFIG_MAP, key) ? UP_CONFIG_MAP[key] : null;

    if (key === 'validationRules.validatePassword') {
      findings.push(findingOf(path, 'validate-password', known?.note ?? '', entry.line));
    } else if (key === 'callback.validate') {
      findings.push(findingOf(path, 'callback-validate', known?.note ?? '', entry.line));
    } else if (known) {
      findings.push(
        findingOf(
          path,
          'unknown-config-key',
          `\`${key}\` is not carried over. ${known.note}`,
          entry.line
        )
      );
    } else {
      findings.push(
        findingOf(
          path,
          'unknown-config-key',
          `\`${key}\` is not a Users & Permissions setting this plugin knows, so it is not carried over.`,
          entry.line
        )
      );
    }
  }

  const config = prune(tree);

  if (Object.keys(config).length === 0) return { block: '', findings };

  const entryTree: Tree = environment ? { config } : { enabled: 'true', config };

  return { block: `${keyText(END_USERS_KEY)}: ${render(entryTree, 0)}`, findings };
};

/* ------------------------------------------------------------------------------------------------
 * The edit
 * ----------------------------------------------------------------------------------------------*/

const applyEdits = (source: string, edits: Edit[]): string =>
  [...edits]
    .sort((a, b) => b.start - a.start || b.end - a.end)
    .reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), source);

/** The whitespace-insensitive form, to tell an entry that is already this block from one that is not */
const normalized = (text: string) => text.replace(/\s+/g, '').replace(/,(?=[}\])])/g, '');

const lineIndent = (source: string, position: number): string => {
  const lineStart = source.lastIndexOf('\n', position - 1) + 1;

  return /^[ \t]*/.exec(source.slice(lineStart))?.[0] ?? '';
};

/** The block with every line after the first moved to `indent` */
const indented = (block: string, indent: string) =>
  block
    .split('\n')
    .map((line, index) => (index === 0 ? line : `${indent}${line}`))
    .join('\n');

/** Adds `text` as the last property of `object`, keeping the file's own indentation and commas */
const appendProperty = (
  ts: Typescript,
  sf: TS.SourceFile,
  source: string,
  object: TS.ObjectLiteralExpression,
  text: string
): Edit => {
  const { properties } = object;
  const last = properties[properties.length - 1];

  if (!last) {
    const indent = `${lineIndent(source, object.getStart(sf))}  `;

    return {
      start: object.getStart(sf) + 1,
      end: object.end - 1,
      text: `\n${indent}${indented(text, indent)},\n${lineIndent(source, object.getStart(sf))}`,
    };
  }

  const indent = lineIndent(source, last.getStart(sf));
  const trailing = properties.hasTrailingComma;

  return trailing
    ? { start: last.end + 1, end: last.end + 1, text: `\n${indent}${indented(text, indent)},` }
    : { start: last.end, end: last.end, text: `,\n${indent}${indented(text, indent)}` };
};

/** The `config.migration` keys a developer sets during the check: the block never overwrites them */
const KEPT_WHEN_SET = new Set([
  'config.migration.duplicates',
  'config.migration.registrationFields',
]);

/** The text of a property of the generated block, its later lines moved back to the left margin */
const propertyText = (
  sf: TS.SourceFile,
  text: string,
  property: TS.ObjectLiteralElementLike
): string => {
  const start = property.getStart(sf);
  const indent = lineIndent(text, start);

  return text
    .slice(start, property.end)
    .split('\n')
    .map((line, index) => (index > 0 && line.startsWith(indent) ? line.slice(indent.length) : line))
    .join('\n');
};

/**
 * The edits that make the project's `'end-users'` object hold what the generated block sets, and
 * nothing else changed: a key the block sets is replaced (a nested object is merged key by key), a
 * key it does not set stays as written, whatever it is. `null` when the entry holds a spread, a
 * computed key or a value that is not written out as an object, which this does not edit.
 */
const mergeInto = (
  ts: Typescript,
  existingSf: TS.SourceFile,
  existingSource: string,
  existing: TS.ObjectLiteralExpression,
  blockSf: TS.SourceFile,
  blockText: string,
  incoming: TS.ObjectLiteralExpression,
  trail: string[]
): Edit[] | null => {
  const current = namedProperties(ts, existing);
  const wanted = namedProperties(ts, incoming);

  if (!current || !wanted) return null;

  const edits: Edit[] = [];

  for (const { name, property } of wanted) {
    const path = [...trail, name].join('.');
    const held = current.find((candidate) => candidate.name === name);
    const incomingValue = unwrap(ts, property.initializer);

    if (!held) {
      edits.push(
        appendProperty(
          ts,
          existingSf,
          existingSource,
          existing,
          propertyText(blockSf, blockText, property)
        )
      );
      continue;
    }

    if (KEPT_WHEN_SET.has(path)) continue;

    const heldValue = unwrap(ts, held.property.initializer);

    if (ts.isObjectLiteralExpression(incomingValue) && ts.isObjectLiteralExpression(heldValue)) {
      const nested = mergeInto(
        ts,
        existingSf,
        existingSource,
        heldValue,
        blockSf,
        blockText,
        incomingValue,
        [...trail, name]
      );

      if (!nested) return null;

      edits.push(...nested);
      continue;
    }

    const wantedText = blockText.slice(
      property.initializer.getStart(blockSf),
      property.initializer.end
    );
    const heldText = existingSource.slice(
      held.property.initializer.getStart(existingSf),
      held.property.initializer.end
    );

    if (normalized(wantedText) !== normalized(heldText)) {
      edits.push({
        start: held.property.initializer.getStart(existingSf),
        end: held.property.initializer.end,
        text: indented(
          wantedText,
          lineIndent(existingSource, held.property.initializer.getStart(existingSf))
        ),
      });
    }
  }

  return edits;
};

/** The edit that turns U&P's entry off, or `null` when it cannot be made, or `[]` when it is off already */
const disableUsersPermissions = (
  ts: Typescript,
  sf: TS.SourceFile,
  source: string,
  entry: NamedProperty | undefined,
  plugins: TS.ObjectLiteralExpression
): Edit[] | null => {
  if (!entry) {
    return [appendProperty(ts, sf, source, plugins, "'users-permissions': { enabled: false },")];
  }

  const value = unwrap(ts, entry.property.initializer);

  if (!ts.isObjectLiteralExpression(value)) return null;

  const properties = namedProperties(ts, value);
  const enabled = properties?.find(({ name }) => name === 'enabled');

  if (enabled) {
    const current = unwrap(ts, enabled.property.initializer);

    if (current.kind === ts.SyntaxKind.FalseKeyword) return [];

    return [
      {
        start: enabled.property.initializer.getStart(sf),
        end: enabled.property.initializer.end,
        text: 'false',
      },
    ];
  }

  // A spread could carry `enabled: true` past a property put before it
  if (!properties) return null;

  const first = value.properties[0];

  if (!first)
    return [{ start: value.getStart(sf) + 1, end: value.end - 1, text: ' enabled: false ' }];

  const indent = lineIndent(source, first.getStart(sf));
  const sameLine =
    ts.getLineAndCharacterOfPosition(sf, first.getStart(sf)).line ===
    ts.getLineAndCharacterOfPosition(sf, value.getStart(sf)).line;

  return [
    {
      start: first.getStart(sf),
      end: first.getStart(sf),
      text: sameLine ? 'enabled: false, ' : `enabled: false,\n${indent}`,
    },
  ];
};

/**
 * Turns Users & Permissions off in `config/plugins` (its `config` stays) and sets the `'end-users'`
 * entry to `block`, by splicing the text at the nodes the parser finds. `after` is `null` when the
 * file builds its plugins from a variable, a spread or a call, which this does not edit; it is the
 * unchanged `source` when there is nothing to do. For an environment file, only `'end-users'` is set.
 */
export const switchPluginsConfig = async (
  path: string,
  source: string,
  block: string
): Promise<{ after: string | null; findings: CodeFinding[] }> => {
  const ts = await loadTypescript();
  const sf = parseSource(ts, path, source);
  const found = locate(ts, sf);

  const notEditable = (reason: string) => ({
    after: null,
    findings: [
      findingOf(
        path,
        'config-not-editable',
        `This file is not changed because ${reason}. Make the change by hand: turn off Users & Permissions (${USERS_PERMISSIONS_LINE}) and add the end-users entry.`
      ),
    ],
  });

  if (!found.ok) return notEditable(found.reason);

  const { plugins, scopeEdits } = found.located;
  const properties = namedProperties(ts, plugins);

  if (!properties)
    return notEditable('its plugins object holds a spread, a variable or a computed key');

  const environment = /(^|[\\/])config[\\/]env[\\/]/.test(path);
  const edits: Edit[] = [];

  if (!environment) {
    const disabled = disableUsersPermissions(
      ts,
      sf,
      source,
      properties.find(({ name }) => name === USERS_PERMISSIONS_KEY),
      plugins
    );

    if (!disabled)
      return notEditable('the users-permissions entry is not an object written out in the file');

    edits.push(...disabled);
  }

  if (block !== '') {
    const existing = properties.find(({ name }) => name === END_USERS_KEY);

    if (existing) {
      const heldEntry = unwrap(ts, existing.property.initializer);
      const blockSf = parseSource(
        ts,
        'block.ts',
        `const entry = {\n${indented(block, '  ').replace(/^/, '  ')}\n};`
      );
      const blockText = blockSf.text;
      let incoming: TS.ObjectLiteralExpression | undefined;

      blockSf.forEachChild((statement) => {
        if (ts.isVariableStatement(statement)) {
          const initializer = statement.declarationList.declarations[0]?.initializer;

          if (initializer && ts.isObjectLiteralExpression(initializer)) {
            const entry = namedProperties(ts, initializer)?.[0]?.property.initializer;

            incoming = entry && ts.isObjectLiteralExpression(entry) ? entry : undefined;
          }
        }
      });

      if (!ts.isObjectLiteralExpression(heldEntry) || !incoming) {
        return notEditable('the end-users entry is not an object written out in the file');
      }

      const merged = mergeInto(ts, sf, source, heldEntry, blockSf, blockText, incoming, []);

      if (!merged) {
        return notEditable('the end-users entry holds a spread, a variable or a computed key');
      }

      edits.push(...merged);
    } else {
      edits.push(appendProperty(ts, sf, source, plugins, `${block},`));
    }
  }

  if (edits.length === 0) return { after: source, findings: [] };

  // `env` is only needed when something is added that calls it
  const needsEnv = block.includes('env(');

  return {
    after: applyEdits(source, needsEnv ? [...edits, ...scopeEdits] : edits),
    findings: [],
  };
};

/** A new `config/plugins` for a project that has none: a TypeScript file when the project has a `tsconfig.json` */
export const createPluginsConfig = (typescript: boolean, block: string): string => {
  const body = [
    `  ${USERS_PERMISSIONS_LINE}`,
    ...(block === '' ? [] : [`  ${indented(block, '  ')},`]),
  ];
  const object = `({ env }) => ({\n${body.join('\n')}\n});\n`;

  return typescript ? `export default ${object}` : `module.exports = ${object}`;
};
