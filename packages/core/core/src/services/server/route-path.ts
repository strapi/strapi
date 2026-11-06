import type Router from '@koa/router';
import type { Core } from '@strapi/types';
/**
 * Boots routes written for path-to-regexp v6 on v8.
 * Remove this translator in Strapi 6, when route paths are v8 only.
 */

export class RoutePathMigrationError extends Error {
  constructor(path: string, reason: string) {
    super(`Cannot migrate route path "${path}" from path-to-regexp v6 to v8: ${reason}`);
    this.name = 'RoutePathMigrationError';
  }
}

export type RoutePathConstraint = {
  name: string;
  pattern: RegExp;
};

export type TranslatedRoutePath = {
  path: string;
  changed: boolean;
  /** Custom parameter patterns, checked against the matched values. */
  constraints: RoutePathConstraint[];
  /** v6 exposed unnamed groups as `ctx.params[0]`, `ctx.params[1]`…: their new names, in order. */
  positionalParams: string[];
  /** Every parameter the path declares, so a rejected match can take its values back. */
  paramNames: string[];
  /** Every parameter name in the translated path, in order: the order of `ctx.captures`. */
  parameterNames: string[];
  /** Required parameters whose pattern matches nothing, which v6 set to `""` instead of leaving out. */
  emptyParams: string[];
  /**
   * Parameters created only so a repeated v6 literal can be checked. Removed before the handler runs.
   */
  hiddenParams: string[];
};

// v6 only made `/` and `.` optional along with a parameter.
const OPTIONAL_PREFIXES = new Set(['/', '.']);

// v6 compiles a route with the `i` flag unless `sensitive` is set, and that flag applies to a
// custom pattern too. Strapi does not expose `sensitive`, so every constraint is case-insensitive.
const CONSTRAINT_FLAGS = 'i';

type RouterLayer = Router['stack'][number];

// v8 parameter names are JavaScript identifiers. v6 names are `[A-Za-z0-9_]+`.
const ID_START = /^[$_\p{ID_Start}]$/u;
const ID_CONTINUE = /^[$\u200c\u200d\p{ID_Continue}]$/u;

const isParameterNameCharacter = (character: string | undefined) =>
  character !== undefined && /[A-Za-z0-9_]/.test(character);

const isV8Identifier = (name: string) => {
  const characters = [...name];

  return (
    characters.length > 0 &&
    ID_START.test(characters[0]) &&
    characters.every((character, index) => index === 0 || ID_CONTINUE.test(character))
  );
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const escapeLiteral = (value: string) => value.replace(/[{}()[\]+?!*:\\]/g, '\\$&');

const readParameterName = (path: string, start: number) => {
  let end = start;
  while (isParameterNameCharacter(path[end])) {
    end += 1;
  }

  return path.slice(start, end);
};

/** A v8 identifier name at `start`, or `''` when none starts there. */
const readIdentifier = (path: string, start: number) => {
  let end = start;

  for (const character of path.slice(start)) {
    if (end === start ? !ID_START.test(character) : !ID_CONTINUE.test(character)) {
      break;
    }
    end += character.length;
  }

  return path.slice(start, end);
};

/** A v8 quoted name whose opening quote is at `start`: its value and the index after the closing quote. */
const readQuotedName = (path: string, start: number) => {
  let name = '';
  let index = start + 1;

  while (index < path.length && path[index] !== '"') {
    if (path[index] === '\\') {
      index += 1;
    }
    name += path[index] ?? '';
    index += 1;
  }

  return { name, end: index + 1 };
};

/** The parameter names of a v8 path, in order, as the router reports them in `ctx.captures`. */
const readV8ParameterNames = (path: string) => {
  const names: string[] = [];

  for (let index = 0; index < path.length; index += 1) {
    const character = path[index];

    if (character === '\\') {
      index += 1;
    } else if (character === ':' || character === '*') {
      if (path[index + 1] === '"') {
        const { name, end } = readQuotedName(path, index + 1);
        names.push(name);
        index = end - 1;
      } else {
        const name = readIdentifier(path, index + 1);
        if (name) {
          names.push(name);
          index += name.length;
        }
      }
    }
  }

  return names;
};

/** Index of the `)` closing the group opened just before `start`, or -1. */
const findPatternEnd = (path: string, start: number): number => {
  let depth = 1;
  let inCharacterClass = false;

  for (let index = start; index < path.length; index += 1) {
    const character = path[index];

    if (character === '\\') {
      index += 1;
      continue;
    }

    if (character === '[') {
      inCharacterClass = true;
      continue;
    }

    if (character === ']' && inCharacterClass) {
      inCharacterClass = false;
      continue;
    }

    if (inCharacterClass) {
      continue;
    }

    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
};

/**
 * Whether a pattern may match text containing `/`, and so must span segments in v8.
 * A range such as `[!-~]` includes `/` without writing the character. When the pattern cannot be
 * compiled, treat it as able to match `/`: a wildcard plus the constraint still matches the same paths.
 */
const canMatchSlash = (pattern: string) => {
  try {
    return new RegExp(`^(?:${pattern})$`, CONSTRAINT_FLAGS).test('/');
  } catch {
    return true;
  }
};

type V6Group = {
  prefix: string;
  name: string;
  pattern?: string;
  suffix: string;
  modifier: string;
  end: number;
};

/**
 * Applies what v8 paths cannot express, for a router without path translation installed. A value
 * its pattern rejects means the route did not match, so the request goes on to the next matching
 * route, as it did in v6.
 *
 * Patterns test the raw captured text, as v6 did. `ctx.params` is decoded, so it is only a fallback.
 */
export const withTranslatedPathMatching = (
  {
    constraints,
    positionalParams,
    paramNames,
    parameterNames,
    emptyParams,
    hiddenParams,
  }: TranslatedRoutePath,
  routeHandler: Core.MiddlewareHandler
): Core.MiddlewareHandler => {
  if (
    constraints.length === 0 &&
    positionalParams.length === 0 &&
    emptyParams.length === 0 &&
    hiddenParams.length === 0
  ) {
    return routeHandler;
  }

  return (ctx, next) => {
    emptyParams.forEach((name) => {
      ctx.params[name] ??= '';
    });

    const { captures } = ctx as { captures?: string[] };

    const rawValue = (name: string): string | undefined => {
      const index = parameterNames.indexOf(name);

      if (captures && index !== -1 && captures.length >= parameterNames.length) {
        // A nested router's prefix parameters come before the route's own, so count from the end.
        return captures[captures.length - parameterNames.length + index] || undefined;
      }

      const value = ctx.params[name];
      return value === undefined ? undefined : (Array.isArray(value) ? value : [value]).join('/');
    };

    const fails = ({ name, pattern }: RoutePathConstraint) => {
      const value = rawValue(name);
      return value !== undefined && !pattern.test(value);
    };

    if (constraints.some(fails)) {
      paramNames.forEach((name) => delete ctx.params[name]);
      return next();
    }

    hiddenParams.forEach((name) => delete ctx.params[name]);

    positionalParams.forEach((name, index) => {
      ctx.params[index] = ctx.params[name];
    });

    return routeHandler(ctx, next);
  };
};

type TranslateOptions = {
  /** Prefixes the names of unnamed and literal groups, so a router prefix and its routes never share one. */
  namespace?: string;
};

export const translateRoutePath = (
  path: string,
  { namespace }: TranslateOptions = {}
): TranslatedRoutePath => {
  let translated = '';
  let changed = false;
  const constraints: RoutePathConstraint[] = [];
  const positionalParams: string[] = [];
  const paramNames: string[] = [];
  const emptyParams: string[] = [];
  const hiddenParams: string[] = [];
  let hiddenCount = 0;

  const fail = (reason: string): never => {
    throw new RoutePathMigrationError(path, reason);
  };

  const formatParameterName = (name: string, nextCharacter: string | undefined) => {
    const nextCharacterExtendsTheName =
      nextCharacter !== undefined &&
      ID_CONTINUE.test(nextCharacter) &&
      !isParameterNameCharacter(nextCharacter);

    if (isV8Identifier(name) && !nextCharacterExtendsTheName) {
      return name;
    }

    changed = true;
    return `"${name}"`;
  };

  const hiddenName = () => {
    const base = `${namespace ?? 'v6'}Literal`;
    let name = `${base}${hiddenCount}`;
    hiddenCount += 1;

    while (paramNames.includes(name)) {
      name = `${base}${hiddenCount}`;
      hiddenCount += 1;
    }

    return name;
  };

  const positionalName = () => {
    const count = positionalParams.length;
    if (namespace) {
      return `${namespace}Splat${count + 1}`;
    }

    return count === 0 ? 'splat' : `splat${count + 1}`;
  };

  const detachOptionalPrefix = () => {
    const last = translated.at(-1);
    if (last !== undefined && OPTIONAL_PREFIXES.has(last) && translated.at(-2) !== '\\') {
      translated = translated.slice(0, -1);
      return last;
    }

    return '';
  };

  const addParameter = (
    name: string,
    pattern: string | undefined,
    modifier: string,
    prefix: string,
    suffix: string,
    nextCharacter: string | undefined
  ) => {
    paramNames.push(name);
    const quoted = formatParameterName(name, suffix[0] ?? nextCharacter);
    const segment = `:${quoted}`;
    const wildcard = `*${quoted}`;
    const escapedPrefix = escapeLiteral(prefix);
    const escapedSuffix = escapeLiteral(suffix);

    const writeOptional = (token: string) => {
      translated += `{${escapedPrefix}${token}${escapedSuffix}}`;
    };
    const writeRequired = (token: string) => {
      translated += `${escapedPrefix}${token}${escapedSuffix}`;
    };

    if (pattern === undefined) {
      if (modifier === '?' || modifier === '*') {
        writeOptional(modifier === '*' ? wildcard : segment);
      } else if (modifier === '+') {
        writeRequired(wildcard);
      } else {
        writeRequired(segment);
      }
      return;
    }

    if ((modifier === '*' || modifier === '+') && prefix === '' && suffix === '') {
      fail(`the repeated parameter ":${name}" has no prefix`);
    }

    if ((modifier === '*' || modifier === '+') && suffix !== '') {
      fail(`the repeated parameter ":${name}" has a suffix`);
    }

    let matcher: RegExp;
    try {
      const body =
        modifier === '*' || modifier === '+'
          ? `(?:${pattern})(?:${escapeRegExp(prefix)}(?:${pattern}))*`
          : `(?:${pattern})`;
      matcher = new RegExp(`^${body}$`, CONSTRAINT_FLAGS);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return fail(`the custom pattern for ":${name}" is invalid: ${reason}`);
    }

    if (pattern !== '.*') {
      constraints.push({ name, pattern: matcher });
    }

    const token =
      modifier === '*' || modifier === '+' || canMatchSlash(pattern) ? wildcard : segment;

    if (modifier === '?' || modifier === '*') {
      writeOptional(token);
      return;
    }

    if (matcher.test('')) {
      emptyParams.push(name);
      translated += `${escapedPrefix}{${token}${escapedSuffix}}`;
      return;
    }

    writeRequired(token);
  };

  /**
   * v6 `{prefix:name(pattern)suffix}modifier`. A group v8 can already parse, such as `{/:id}` or
   * `{*path}`, is left alone: bare braces are optional in v8 and required in v6, and this release
   * writes the v8 form. A trailing `?*+` or a custom pattern cannot be a v8 group, so those are v6.
   */
  const tryParseV6Group = (start: number): V6Group | undefined => {
    let cursor = start + 1;
    let prefix = '';

    while (cursor < path.length) {
      const character = path[cursor];

      if (character === '\\') {
        const escaped = path[cursor + 1];
        if (escaped === undefined) {
          return undefined;
        }
        prefix += escaped;
        cursor += 2;
        continue;
      }

      if (
        character === '*' ||
        character === '{' ||
        character === '}' ||
        character === ':' ||
        character === '('
      ) {
        break;
      }

      prefix += character;
      cursor += 1;
    }

    if (path[cursor] === '*' || path[cursor] === '{') {
      return undefined;
    }

    let name = '';
    if (path[cursor] === ':') {
      if (!isParameterNameCharacter(path[cursor + 1])) {
        return undefined;
      }

      name = readParameterName(path, cursor + 1);
      cursor += 1 + name.length;
    }

    let pattern: string | undefined;
    if (path[cursor] === '(') {
      const patternStart = cursor;
      const patternEnd = findPatternEnd(path, cursor + 1);
      if (patternEnd === -1) {
        fail(`the pattern opened at position ${patternStart} is unclosed`);
      }

      pattern = path.slice(cursor + 1, patternEnd);
      cursor = patternEnd + 1;
    }

    let suffix = '';
    while (cursor < path.length && path[cursor] !== '}') {
      const character = path[cursor];

      if (character === '\\') {
        const escaped = path[cursor + 1];
        if (escaped === undefined) {
          return undefined;
        }
        suffix += escaped;
        cursor += 2;
        continue;
      }

      if (character === '{' || character === ':' || character === '(' || character === '*') {
        return undefined;
      }

      suffix += character;
      cursor += 1;
    }

    if (path[cursor] !== '}') {
      return undefined;
    }

    cursor += 1;
    const nextCharacter = path[cursor];
    const modifier =
      nextCharacter !== undefined && '?*+'.includes(nextCharacter) ? nextCharacter : '';
    if (modifier) {
      cursor += 1;
    }

    return { prefix, name, pattern, suffix, modifier, end: cursor };
  };

  const emitLiteralGroup = (group: V6Group) => {
    const literal = `${group.prefix}${group.suffix}`;

    if (group.modifier === '?') {
      translated += `{${escapeLiteral(literal)}}`;
      return;
    }

    const name = hiddenName();
    paramNames.push(name);
    hiddenParams.push(name);
    constraints.push({
      name,
      pattern: new RegExp(
        `^(?:${escapeRegExp(literal)})${group.modifier === '*' ? '*' : '+'}$`,
        CONSTRAINT_FLAGS
      ),
    });

    const token = literal.includes('/') ? `*${name}` : `:${name}`;
    translated += group.modifier === '*' ? `{${token}}` : token;
  };

  const emitGroup = (group: V6Group) => {
    changed = true;

    if (group.pattern?.startsWith('?')) {
      fail(
        `the group "(${group.pattern})" has no v8 equivalent, split the route or name the parameter`
      );
    }

    if (!group.name && group.pattern === undefined) {
      emitLiteralGroup(group);
      return;
    }

    let name = group.name;
    if (!name) {
      name = positionalName();
      positionalParams.push(name);
    }

    addParameter(name, group.pattern, group.modifier, group.prefix, group.suffix, path[group.end]);
  };

  for (let index = 0; index < path.length; index += 1) {
    const character = path[index];

    if (character === '\\') {
      translated += path.slice(index, index + 2);
      index += 1;
      continue;
    }

    if (character === '{') {
      const group = tryParseV6Group(index);
      const isV6Group =
        group !== undefined && (group.modifier !== '' || group.pattern !== undefined);

      if (group !== undefined && isV6Group) {
        emitGroup(group);
        index = group.end - 1;
        continue;
      }

      translated += character;
      continue;
    }

    const isParameter = character === ':' && isParameterNameCharacter(path[index + 1]);

    if (isParameter || character === '(') {
      let name = '';
      let cursor = index;

      if (isParameter) {
        name = readParameterName(path, index + 1);
        cursor = index + 1 + name.length;
      }

      let pattern: string | undefined;
      if (path[cursor] === '(') {
        const patternEnd = findPatternEnd(path, cursor + 1);
        if (patternEnd === -1) {
          fail(`the pattern opened at position ${cursor} is unclosed`);
        }

        pattern = path.slice(cursor + 1, patternEnd);
        cursor = patternEnd + 1;
      }

      const nextCharacter = path[cursor];
      const modifier =
        nextCharacter !== undefined && '?*+'.includes(nextCharacter) ? nextCharacter : '';
      if (modifier) {
        cursor += 1;
      }

      if (!isParameter && pattern !== undefined) {
        if (pattern.startsWith('?')) {
          fail(
            `the group "(${pattern})" has no v8 equivalent, split the route or name the parameter`
          );
        }

        name = positionalName();
        positionalParams.push(name);
      }

      if (isParameter && pattern === undefined && !modifier) {
        paramNames.push(name);
        translated += `:${formatParameterName(name, path[cursor])}`;
      } else {
        changed = true;
        addParameter(name, pattern, modifier, detachOptionalPrefix(), '', path[cursor]);
      }

      index = cursor - 1;
      continue;
    }

    // v8 quoted names (`:"my name"`, `*"my path"`) and wildcards such as `/*$rest` were invalid in
    // v6, so they are copied whole: their content is a name, not v6 syntax.
    if ((character === ':' || character === '*') && path[index + 1] === '"') {
      const { end } = readQuotedName(path, index + 1);
      translated += path.slice(index, end);
      index = end - 1;
      continue;
    }

    if (character === '*') {
      const name = readIdentifier(path, index + 1);
      if (name) {
        translated += `*${name}`;
        index += name.length;
        continue;
      }
    }

    if ('?*+)'.includes(character)) {
      fail(`unexpected "${character}" at position ${index}`);
    }

    if ('[]!'.includes(character)) {
      translated += `\\${character}`;
      changed = true;
      continue;
    }

    translated += character;
  }

  return {
    path: translated,
    changed,
    constraints,
    positionalParams,
    paramNames,
    parameterNames: readV8ParameterNames(translated),
    emptyParams,
    hiddenParams,
  };
};

type Logger = { log: { warn: (message: string) => void } };

/**
 * Set on a route object to keep its v6 path without a boot warning. For Strapi's own routes, whose
 * v6 paths stay as they were so `ctx.params` and the API documentation do not change.
 */
export const KEEP_V6_ROUTE_PATH = Symbol.for('strapi.route.keepV6Path');

const migrateRouterPath = (
  path: string,
  methods: string[],
  strapi: Logger,
  options?: TranslateOptions
) => {
  const translated = translateRoutePath(path, options);

  if (translated.changed) {
    const method = methods.map((item) => item.toUpperCase()).join(',');
    strapi.log.warn(
      `Route "${method} ${path}" uses path-to-regexp v6 syntax and was migrated to "${translated.path}".`
    );
  }

  return translated;
};

/** One piece of a layer's path, as written and as translated: a router prefix, a mount path or a route. */
type RoutePathPart = {
  source: string;
  path: string;
  constraints: RoutePathConstraint[];
  positionalParams: string[];
  emptyParams: string[];
  hiddenParams: string[];
};

// Parts live on the layer under a symbol. Koa copies a nested router's layers with Object.assign,
// which keeps symbol properties, so they survive being mounted under another router.
const LAYER_PARTS = Symbol('strapi.routePath.parts');
const LAYER_SHIM = Symbol('strapi.routePath.shim');

type TranslatedLayer = RouterLayer & { [LAYER_PARTS]?: RoutePathPart[] };
type LayerMiddleware = RouterLayer['stack'][number];
type ShimContext = { params: Record<string | number, unknown>; _matchedRoute?: string };

/**
 * A prefix or mount path names its unnamed groups only to read them, so it hides those names once
 * they are copied to `ctx.params[0]`, `ctx.params[1]`… as v6 exposed them.
 */
const toPart = (
  source: string,
  translated: TranslatedRoutePath,
  { hidePositional = false } = {}
): RoutePathPart => ({
  source,
  path: translated.path,
  constraints: translated.constraints,
  positionalParams: translated.positionalParams,
  emptyParams: translated.emptyParams,
  hiddenParams: hidePositional
    ? [...translated.hiddenParams, ...translated.positionalParams]
    : translated.hiddenParams,
});

const partNeedsShim = (part: RoutePathPart) =>
  part.source !== part.path ||
  part.positionalParams.length > 0 ||
  part.emptyParams.length > 0 ||
  part.hiddenParams.length > 0;

/**
 * The path of a layer as it was written, before translation. Falls back to the layer's path when
 * the router changed it in a way the parts do not describe.
 */
export const getRouteSourcePath = (layer: { path: string | RegExp }): string => {
  const parts = (layer as { [LAYER_PARTS]?: RoutePathPart[] })[LAYER_PARTS];

  if (!parts?.length || typeof layer.path !== 'string') {
    return String(layer.path);
  }

  let rest = layer.path;
  let source = '';

  for (const part of parts) {
    if (rest.startsWith(part.path)) {
      rest = rest.slice(part.path.length);
      source += part.source;
    } else if (rest !== '' || part.path !== '/') {
      // Koa drops a route's own `/` under a prefix, so only that part may be missing.
      return layer.path;
    }
  }

  return rest === '' ? source : layer.path;
};

/**
 * Runs first in a layer's stack. Restores what v6 exposed: `""` for a required parameter that
 * matched nothing, unnamed groups as `ctx.params[0]`…, and the route as written in `_matchedRoute`.
 */
const createLayerShim = (layer: TranslatedLayer): LayerMiddleware => {
  const shim = (ctx: ShimContext, next: () => Promise<unknown>) => {
    const parts = layer[LAYER_PARTS] ?? [];

    parts.forEach((part) => {
      part.emptyParams.forEach((name) => {
        ctx.params[name] ??= '';
      });
    });

    parts
      .flatMap((part) => part.positionalParams)
      .forEach((name, index) => {
        ctx.params[index] = ctx.params[name];
      });

    parts.forEach((part) => {
      part.hiddenParams.forEach((name) => {
        delete ctx.params[name];
      });
    });

    const source = getRouteSourcePath(layer);
    if (source !== layer.path) {
      ctx._matchedRoute = source;
    }

    return next();
  };

  return Object.assign(shim, { [LAYER_SHIM]: true }) as unknown as LayerMiddleware;
};

const isShim = (middleware: LayerMiddleware) =>
  (middleware as unknown as { [LAYER_SHIM]?: boolean })[LAYER_SHIM] === true;

const setLayerParts = (layer: TranslatedLayer, parts: RoutePathPart[]) => {
  layer[LAYER_PARTS] = parts;

  // A copied layer still holds the shim of the layer it was copied from, so it gets its own.
  const stack = layer.stack.filter((middleware) => !isShim(middleware));
  layer.stack = parts.some(partNeedsShim) ? [createLayerShim(layer), ...stack] : stack;
};

/**
 * Whether a layer accepts a request path. Its constraints are tested against the raw captured
 * text, as v6 did, so `%2F` is not decoded before a `[^/]+` pattern sees it.
 */
const layerAcceptsPath = (layer: TranslatedLayer, path: string) => {
  const constraints = (layer[LAYER_PARTS] ?? []).flatMap((part) => part.constraints);

  if (constraints.length === 0) {
    return true;
  }

  try {
    const captures = layer.captures(path);

    return constraints.every(({ name, pattern }) => {
      const index = layer.paramNames.findIndex((parameter) => parameter.name === name);
      const value = index === -1 ? undefined : captures[index];

      return !value || pattern.test(value);
    });
  } catch {
    return true;
  }
};

const isNestedRouter = (middleware: unknown): middleware is { router: object } =>
  typeof middleware === 'function' &&
  'router' in middleware &&
  (middleware as { router?: unknown }).router !== undefined;

const translatedRouters = new WeakSet<Router>();
const prefixParts = new WeakMap<Router, RoutePathPart>();

// Names of unnamed groups in prefixes and mount paths, unique across every router.
let namespaceCount = 0;
const nextNamespace = (kind: string) => {
  namespaceCount += 1;
  return `v6${kind}${namespaceCount}`;
};

// A route object translated by the endpoint composer, handed to the `register` call it makes next.
let pendingRoute: { source: string; translated: TranslatedRoutePath } | undefined;

/**
 * Registers a translated route object. On a router with path translation installed, the layer
 * records the path as written. Elsewhere, the handler applies the v6 behaviour itself.
 */
export const registerTranslatedRoute = (
  router: Router,
  source: string,
  translated: TranslatedRoutePath,
  handler: Core.MiddlewareHandler,
  register: (handler: Core.MiddlewareHandler) => void
) => {
  if (!translatedRouters.has(router)) {
    register(withTranslatedPathMatching(translated, handler));
    return;
  }

  pendingRoute = { source, translated };
  try {
    register(handler);
  } finally {
    pendingRoute = undefined;
  }
};

/**
 * Translates v6 paths registered on a Koa router (`use`, `get`/`post`/…, `register`, `prefix`),
 * and a v6 router prefix. Every layer records its path as written, so constraints, `ctx.params`
 * and `ctx._matchedRoute` behave as they did in v6, including under prefixes and mount paths.
 */
export const installRoutePathTranslation = (router: Router, strapi: Logger) => {
  const originalRegister = router.register.bind(router);
  const originalUse = router.use.bind(router);
  const originalMatch = router.match.bind(router);
  const originalPrefix = router.prefix.bind(router);

  translatedRouters.add(router);

  const translatePrefix = (prefix: string) => {
    const translated = translateRoutePath(prefix, { namespace: nextNamespace('Prefix') });

    if (translated.changed) {
      strapi.log.warn(
        `Router prefix "${prefix}" uses path-to-regexp v6 syntax and was migrated to "${translated.path}".`
      );
    }

    return toPart(prefix, translated, { hidePositional: true });
  };

  const currentPrefixParts = () => {
    const part = prefixParts.get(router);
    return part ? [part] : [];
  };

  const { prefix } = router.opts;

  if (prefix) {
    const part = translatePrefix(prefix);
    router.opts.prefix = part.path;
    prefixParts.set(router, part);
  }

  // `use()` registers its middleware through `register()`, and describes the layer itself.
  let insideUse = 0;

  router.register = function register(path, methods, middleware, options) {
    // A pathless `use()` asks register for the regexp source `(?:\/|$)` and sets pathAsRegExp.
    if (insideUse > 0 || typeof path !== 'string' || options?.pathAsRegExp) {
      const result = originalRegister(path, methods, middleware, options);

      if (insideUse === 0 && prefixParts.has(router)) {
        setLayerParts(result as RouterLayer, currentPrefixParts());
      }

      return result;
    }

    const pending = pendingRoute?.translated.path === path ? pendingRoute : undefined;
    pendingRoute = undefined;

    const translated = pending?.translated ?? migrateRouterPath(path, methods, strapi);
    const source = pending?.source ?? path;

    // For a string path, koa-router returns the layer it just added; the `Router` branch is for chaining.
    const layer = originalRegister(translated.path, methods, middleware, options) as RouterLayer;
    setLayerParts(layer, [...currentPrefixParts(), toPart(source, translated)]);

    return layer;
  } as typeof router.register;

  router.use = function use(first: unknown, ...rest: unknown[]) {
    // Koa calls `use()` once per path, which describes each layer.
    if (Array.isArray(first)) {
      return originalUse(first as never, ...(rest as never[]));
    }

    const before = router.stack.length;
    let mountParts: RoutePathPart[] = [];
    let result: ReturnType<typeof originalUse>;

    insideUse += 1;
    try {
      if (typeof first === 'string') {
        // A nested router's routes may have unnamed groups of their own, so its mount path's are namespaced.
        const nested = rest.some(isNestedRouter);
        const translated = migrateRouterPath(
          first,
          ['use'],
          strapi,
          nested ? { namespace: nextNamespace('Mount') } : undefined
        );

        mountParts = [toPart(first, translated, { hidePositional: nested })];
        result = originalUse(translated.path, ...(rest as never[]));
      } else {
        result = originalUse(first as never, ...(rest as never[]));
      }
    } finally {
      insideUse -= 1;
    }

    // A nested router's layers arrive with their own parts; the prefix and mount path come first.
    (router.stack.slice(before) as TranslatedLayer[]).forEach((layer) => {
      setLayerParts(layer, [...currentPrefixParts(), ...mountParts, ...(layer[LAYER_PARTS] ?? [])]);
    });

    return result;
  } as typeof router.use;

  router.prefix = function setPrefix(prefixPath: string) {
    const previous = prefixParts.get(router);
    const part = translatePrefix(prefixPath.replace(/\/$/, ''));

    originalPrefix(part.path);
    prefixParts.set(router, part);

    (router.stack as TranslatedLayer[]).forEach((layer) => {
      const parts = (layer[LAYER_PARTS] ?? []).filter((item) => item !== previous);
      setLayerParts(layer, [part, ...parts]);
    });

    return router;
  } as typeof router.prefix;

  // A rejected constraint is not a path match. Otherwise allowedMethods answers 405.
  router.match = function match(path, method) {
    const result = originalMatch(path, method);

    if (typeof path !== 'string') {
      return result;
    }

    const pathLayers = result.path.filter((layer) => layerAcceptsPath(layer, path));
    const pathAndMethod = result.pathAndMethod.filter((layer) => layerAcceptsPath(layer, path));

    return {
      path: pathLayers,
      pathAndMethod,
      route: pathAndMethod.some((layer) => layer.methods.length > 0),
    };
  } as typeof router.match;
};
