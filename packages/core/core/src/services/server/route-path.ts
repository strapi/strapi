import type Router from '@koa/router';
import type { Core } from '@strapi/types';
import { pathToRegexp as compileV6Path, type Key as V6Key } from 'path-to-regexp-v6';

/**
 * Boots routes written for path-to-regexp v6 on v8.
 * Remove this translator in Strapi 6, when route paths are v8 only.
 *
 * A v6 path becomes a v8 path that matches every request the v6 path matched, and sometimes more.
 * The v6 path, compiled by path-to-regexp v6, then decides which requests match and fills
 * `ctx.params`, so the route behaves as it did with @koa/router 12.
 */

export class RoutePathMigrationError extends Error {
  constructor(path: string, reason: string) {
    super(`Cannot migrate route path "${path}" from path-to-regexp v6 to v8: ${reason}`);
    this.name = 'RoutePathMigrationError';
  }
}

export type TranslatedRoutePath = {
  path: string;
  changed: boolean;
  /** Names the v8 path needs that the v6 path does not have. Removed before the handler runs. */
  generatedParams: string[];
};

// v6 only made `/` and `.` optional along with a parameter.
const OPTIONAL_PREFIXES = new Set(['/', '.']);

const SLASH = 0x2f;

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

const escapeLiteral = (value: string) => value.replace(/[{}()[\]+?!*:\\]/g, '\\$&');

const safeDecodeURIComponent = (text: string) => {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
};

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

/** A v8 quoted name whose opening quote is at `start`: the index after the closing quote. */
const readQuotedNameEnd = (path: string, start: number) => {
  let index = start + 1;

  while (index < path.length && path[index] !== '"') {
    if (path[index] === '\\') {
      index += 1;
    }
    index += 1;
  }

  return index + 1;
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

const CONTROL_ESCAPES: Record<string, number> = { n: 10, r: 13, t: 9, f: 12, v: 11 };

/** The index of the `]` closing a character class that cannot match `/`, or -1 when it may. */
const scanSlashFreeClass = (pattern: string, start: number) => {
  let index = start + 1;
  if (pattern[index] === '^') {
    return -1;
  }

  let previous: number | undefined;
  let inRange = false;

  while (index < pattern.length && pattern[index] !== ']') {
    let code: number | undefined;

    if (pattern[index] === '\\') {
      const escaped = pattern[index + 1];
      index += 2;

      if (escaped === 'd' || escaped === 'w' || escaped === 's') {
        if (inRange) {
          return -1;
        }
        previous = undefined;
        continue;
      }

      if (escaped === undefined || (/[A-Za-z]/.test(escaped) && !(escaped in CONTROL_ESCAPES))) {
        return -1;
      }

      code = CONTROL_ESCAPES[escaped] ?? escaped.codePointAt(0);
    } else {
      code = pattern.codePointAt(index) as number;
      index += String.fromCodePoint(code).length;

      if (code === 0x2d && previous !== undefined && !inRange && pattern[index] !== ']') {
        inRange = true;
        continue;
      }
    }

    if (code === SLASH) {
      return -1;
    }

    if (inRange) {
      if (previous !== undefined && code !== undefined && previous <= SLASH && SLASH <= code) {
        return -1;
      }
      inRange = false;
      previous = undefined;
      continue;
    }

    previous = code;
  }

  return index < pattern.length ? index : -1;
};

/**
 * Whether a custom pattern may match text containing `/`, so its parameter must span segments in
 * v8. Answers yes unless the pattern is built only from parts that cannot match `/`.
 */
const patternMayMatchSlash = (pattern: string) => {
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];

    if (character === '\\') {
      const escaped = pattern[index + 1];
      index += 1;

      if (
        escaped === undefined ||
        escaped === '/' ||
        (/[A-Za-z]/.test(escaped) && !'dwsbB'.includes(escaped) && !(escaped in CONTROL_ESCAPES))
      ) {
        return true;
      }
      continue;
    }

    if (character === '.' || character === '/') {
      return true;
    }

    if (character === '[') {
      const end = scanSlashFreeClass(pattern, index);
      if (end === -1) {
        return true;
      }
      index = end;
    }
  }

  return false;
};

type V6Group = {
  prefix: string;
  name: string;
  pattern?: string;
  suffix: string;
  modifier: string;
  end: number;
};

type TranslateOptions = {
  /** Prefixes the names the translation creates, so a router prefix and its routes never share one. */
  namespace?: string;
};

export const translateRoutePath = (
  path: string,
  { namespace }: TranslateOptions = {}
): TranslatedRoutePath => {
  let translated = '';
  let changed = false;
  const generatedParams: string[] = [];
  const usedNames = new Set(
    [...path.matchAll(/[:*]([$\w]+)/g)].map(([, name]) => name).filter(Boolean)
  );
  // Where the last parameter was written, so a parameter right after it can join it.
  let lastParameter: { start: number; end: number; joined?: string } | undefined;

  const fail = (reason: string): never => {
    throw new RoutePathMigrationError(path, reason);
  };

  // A character that may continue a v8 identifier would become part of the name, so the name is quoted.
  const formatParameterName = (name: string, nextCharacter: string | undefined) => {
    if (isV8Identifier(name) && !(nextCharacter !== undefined && ID_CONTINUE.test(nextCharacter))) {
      return name;
    }

    changed = true;
    return `"${name.replace(/["\\]/g, '\\$&')}"`;
  };

  // A namespaced name holds a `:`, so @koa/router sees parameters in a prefix of wildcards only.
  const generateName = (kind: string) => {
    const base = namespace ? `${namespace}:${kind}` : `v6${kind}`;
    let count = 1;
    while (usedNames.has(`${base}${count}`)) {
      count += 1;
    }

    const name = `${base}${count}`;
    usedNames.add(name);
    generatedParams.push(name);
    return name;
  };

  /**
   * v8 needs text between two parameters, and v6 did not. One wildcard stands for parameters
   * written next to each other, and the v6 path splits its value.
   */
  const writeParameter = (text: string, hasLeadingText: boolean) => {
    if (!hasLeadingText && lastParameter?.end === translated.length) {
      const joined = lastParameter.joined ?? generateName('Joined');
      translated = `${translated.slice(0, lastParameter.start)}{*${formatParameterName(joined, undefined)}}`;
      lastParameter = { start: lastParameter.start, end: translated.length, joined };
      return;
    }

    const start = translated.length;
    translated += text;
    lastParameter = { start, end: translated.length };
  };

  const detachOptionalPrefix = () => {
    const last = translated.at(-1);
    if (last !== undefined && OPTIONAL_PREFIXES.has(last) && translated.at(-2) !== '\\') {
      translated = translated.slice(0, -1);
      if (lastParameter && lastParameter.end > translated.length) {
        lastParameter = undefined;
      }
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
    if (pattern !== undefined) {
      try {
        // eslint-disable-next-line no-new
        new RegExp(`^(?:${pattern})$`, 'i');
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        fail(`the custom pattern for ":${name}" is invalid: ${reason}`);
      }
    }

    const quoted = formatParameterName(name, suffix[0] ?? nextCharacter);
    const repeated = modifier === '*' || modifier === '+';
    const spansSegments = repeated || (pattern !== undefined && patternMayMatchSlash(pattern));
    const token = `${spansSegments ? '*' : ':'}${quoted}`;
    const escapedPrefix = escapeLiteral(prefix);
    const escapedSuffix = escapeLiteral(suffix);

    if (modifier === '?' || modifier === '*') {
      writeParameter(`{${escapedPrefix}${token}${escapedSuffix}}`, prefix !== '');
      return;
    }

    // A v8 parameter matches at least one character, and a pattern such as `.*` may match none.
    if (pattern !== undefined && new RegExp(`^(?:${pattern})$`, 'i').test('')) {
      writeParameter(`${escapedPrefix}{${token}}${escapedSuffix}`, prefix !== '');
      return;
    }

    writeParameter(`${escapedPrefix}${token}${escapedSuffix}`, prefix !== '');
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

    // v8 cannot repeat a literal, so a parameter stands for the repetitions.
    const name = formatParameterName(generateName('Literal'), undefined);
    const token = literal.includes('/') ? `*${name}` : `:${name}`;
    writeParameter(group.modifier === '*' ? `{${token}}` : token, false);
  };

  const failOnLookaround = (pattern: string | undefined) => {
    if (pattern?.startsWith('?')) {
      fail(`the group "(${pattern})" has no v8 equivalent, split the route or name the parameter`);
    }
  };

  const emitGroup = (group: V6Group) => {
    changed = true;
    failOnLookaround(group.pattern);

    if (!group.name && group.pattern === undefined) {
      emitLiteralGroup(group);
      return;
    }

    const name = group.name || generateName('Group');
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

      if (!isParameter) {
        failOnLookaround(pattern);
        name = generateName('Group');
      }

      if (isParameter && pattern === undefined && !modifier) {
        writeParameter(`:${formatParameterName(name, path[cursor])}`, false);
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
      const end = readQuotedNameEnd(path, index + 1);
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

  if (changed) {
    try {
      compileV6Path(path);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      fail(`it is not a valid path-to-regexp v6 path: ${reason}`);
    }
  }

  return { path: translated, changed, generatedParams };
};

/**
 * The v6 form of a path that translation left unchanged, so it can be joined to v6 parts.
 * `undefined` when v6 cannot express it, such as a quoted name.
 */
const toV6Path = (path: string): string | undefined => {
  let v6 = '';
  let inGroup = false;

  for (let index = 0; index < path.length; index += 1) {
    const character = path[index];

    if (character === '\\') {
      v6 += path.slice(index, index + 2);
      index += 1;
      continue;
    }

    if (character === '{') {
      if (inGroup) {
        return undefined;
      }
      inGroup = true;
      v6 += character;
      continue;
    }

    if (character === '}') {
      inGroup = false;
      v6 += '}?';
      continue;
    }

    if (character === ':' || character === '*') {
      const name = readIdentifier(path, index + 1);
      if (!name || !/^\w+$/.test(name)) {
        return undefined;
      }

      v6 += character === ':' ? `:${name}` : `:${name}(.+)`;
      index += name.length;
      continue;
    }

    if ('()[]?+!'.includes(character)) {
      return undefined;
    }

    v6 += character;
  }

  return v6;
};

type V6Matcher = { regexp: RegExp; keys: V6Key[] };

/** Sets `ctx.params` as @koa/router 12 did: decoded, and only for parameters that matched text. */
const applyV6Params = (
  params: Record<string | number, unknown>,
  keys: V6Key[],
  match: RegExpExecArray
) => {
  keys.forEach((key, index) => {
    const value = match[index + 1];
    if (value) {
      params[key.name] = safeDecodeURIComponent(value);
    }
  });
};

type ParamsContext = { params: Record<string | number, unknown>; path: string };

/**
 * Applies a v6 path on a router without path translation installed. The v6 path is matched against
 * the end of the request path, since the router's own prefix is v8. A request it rejects goes on
 * to the next matching route, as it did in v6.
 */
export const withTranslatedPathMatching = (
  source: string,
  { changed, generatedParams }: TranslatedRoutePath,
  routeHandler: Core.MiddlewareHandler
): Core.MiddlewareHandler => {
  if (!changed) {
    return routeHandler;
  }

  const keys: V6Key[] = [];
  const regexp = compileV6Path(source, keys, { start: false });

  return (ctx, next) => {
    const { params, path } = ctx as unknown as ParamsContext;
    const match = regexp.exec(path);

    generatedParams.forEach((name) => delete params[name]);

    if (!match) {
      keys.forEach(({ name }) => delete params[name]);
      return next();
    }

    applyV6Params(params, keys, match);
    return routeHandler(ctx, next);
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
  /** The v6 form of the part, or `undefined` when v6 cannot express it. */
  v6: string | undefined;
  generatedParams: string[];
};

type LayerMatcher = V6Matcher & {
  /** The layer's path when the matcher was built. A layer copied and re-prefixed elsewhere differs. */
  layerPath: string;
  keyNames: Set<string | number>;
  ignoreCaptures: boolean;
};

// State lives on the layer under symbols. Koa copies a nested router's layers with Object.assign,
// which keeps symbol properties, so it survives being mounted under another router.
const LAYER_PARTS = Symbol('strapi.routePath.parts');
const LAYER_MATCHER = Symbol('strapi.routePath.matcher');
const LAYER_PATHLESS = Symbol('strapi.routePath.pathless');
const LAYER_SHIM = Symbol('strapi.routePath.shim');

type TranslatedLayer = RouterLayer & {
  [LAYER_PARTS]?: RoutePathPart[];
  [LAYER_MATCHER]?: LayerMatcher;
  [LAYER_PATHLESS]?: boolean;
};
type LayerMiddleware = RouterLayer['stack'][number];
type ShimContext = ParamsContext & {
  captures?: string[];
  newRouterPath?: string;
  _matchedRoute?: string;
};

const toPart = (source: string, translated: TranslatedRoutePath): RoutePathPart => ({
  source,
  path: translated.path,
  v6: translated.changed ? source : toV6Path(source),
  generatedParams: translated.generatedParams,
});

const isTranslatedPart = (part: RoutePathPart) => part.source !== part.path;

/**
 * Joins what `pick` returns for each part, as @koa/router 12 joined prefixes and paths. `undefined`
 * when the layer's path is not made of its parts, or `pick` has nothing for one of them.
 */
const joinLayerParts = (
  layer: TranslatedLayer,
  pick: (part: RoutePathPart) => string | undefined,
  { allowRest = false } = {}
): string | undefined => {
  const parts = layer[LAYER_PARTS];

  if (!parts?.length || typeof layer.path !== 'string') {
    return undefined;
  }

  let rest = layer.path;
  let joined = '';

  for (const part of parts) {
    const value = pick(part);

    if (value === undefined) {
      return undefined;
    }

    if (rest.startsWith(part.path)) {
      rest = rest.slice(part.path.length);
      joined += value;
    } else if (rest !== '' || part.path !== '/') {
      // Koa drops a route's own `/` under a prefix, so only that part may be missing.
      return undefined;
    }
  }

  return rest === '' || allowRest ? joined : undefined;
};

/**
 * The path of a layer as it was written, before translation. Falls back to the layer's path when
 * the router changed it in a way the parts do not describe.
 */
export const getRouteSourcePath = (layer: { path: string | RegExp }): string =>
  joinLayerParts(layer as TranslatedLayer, (part) => part.source) ?? String(layer.path);

/** Compiles a layer's path as @koa/router 12 compiled it, when one of its parts was written in v6. */
const createLayerMatcher = (layer: TranslatedLayer): LayerMatcher | undefined => {
  const parts = layer[LAYER_PARTS] ?? [];

  if (!parts.some(isTranslatedPart) || typeof layer.path !== 'string') {
    return undefined;
  }

  // @koa/router 12 registered a pathless `use()` as `([^/]*)` after the prefix.
  const pathless = layer[LAYER_PATHLESS] === true;
  const joined = joinLayerParts(layer, (part) => part.v6, { allowRest: pathless });

  if (joined === undefined) {
    return undefined;
  }

  const keys: V6Key[] = [];

  try {
    const isMiddleware = layer.methods.length === 0;
    const regexp = compileV6Path(pathless ? `${joined}([^/]*)` : joined, keys, {
      end: !isMiddleware && layer.opts.end !== false,
      sensitive: layer.opts.sensitive === true,
      strict: layer.opts.strict === true,
    });

    return {
      regexp,
      keys,
      layerPath: layer.path,
      keyNames: new Set(keys.map(({ name }) => name)),
      ignoreCaptures: pathless && keys.length === 1,
    };
  } catch {
    return undefined;
  }
};

const currentMatcher = (layer: TranslatedLayer) => {
  const matcher = layer[LAYER_MATCHER];
  return matcher?.layerPath === layer.path ? matcher : undefined;
};

/**
 * Runs first in a layer's stack. Replaces the parameters the v8 path matched with those of the v6
 * path, and reports the route as written in `_matchedRoute`.
 */
const createLayerShim = (layer: TranslatedLayer): LayerMiddleware => {
  const shim = (ctx: ShimContext, next: () => Promise<unknown>) => {
    const matcher = currentMatcher(layer);

    if (matcher) {
      const match = matcher.regexp.exec(ctx.newRouterPath || ctx.path);

      layer.paramNames.forEach(({ name }, index) => {
        if (!matcher.keyNames.has(name) || ctx.captures?.[index]) {
          delete ctx.params[name];
        }
      });

      if (match && !matcher.ignoreCaptures) {
        applyV6Params(ctx.params, matcher.keys, match);
      }
    } else {
      (layer[LAYER_PARTS] ?? []).forEach((part) => {
        part.generatedParams.forEach((name) => delete ctx.params[name]);
      });
    }

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
  layer[LAYER_MATCHER] = createLayerMatcher(layer);

  // A copied layer still holds the shim of the layer it was copied from, so it gets its own.
  const stack = layer.stack.filter((middleware) => !isShim(middleware));
  layer.stack = parts.some(isTranslatedPart) ? [createLayerShim(layer), ...stack] : stack;
};

/** Whether a layer accepts a request path: its v6 path decides when it has one. */
const layerAcceptsPath = (layer: TranslatedLayer, path: string) =>
  currentMatcher(layer)?.regexp.test(path) ?? true;

/** A layer from a router without path translation: its path after `head`, as a part of its own. */
const untranslatedRest = (layer: TranslatedLayer, head: RoutePathPart[]): RoutePathPart[] => {
  const start = head.map((part) => part.path).join('');

  if (typeof layer.path !== 'string' || !layer.path.startsWith(start)) {
    return [];
  }

  const rest = layer.path.slice(start.length);
  return rest ? [{ source: rest, path: rest, v6: toV6Path(rest), generatedParams: [] }] : [];
};

const isNestedRouter = (middleware: unknown): middleware is { router: object } =>
  typeof middleware === 'function' &&
  'router' in middleware &&
  (middleware as { router?: unknown }).router !== undefined;

const translatedRouters = new WeakSet<Router>();
const prefixParts = new WeakMap<Router, RoutePathPart>();

// Namespaces for the names a prefix or mount path creates, unique across every router.
let namespaceCount = 0;
const nextNamespace = (kind: string) => {
  namespaceCount += 1;
  return `v6${kind}${namespaceCount}`;
};

// A route object translated by the endpoint composer, handed to the `register` call it makes next.
let pendingRoute: { source: string; translated: TranslatedRoutePath } | undefined;

/**
 * Registers a translated route object. On a router with path translation installed, the layer
 * records the path as written. Elsewhere, the handler applies the v6 path itself.
 */
export const registerTranslatedRoute = (
  router: Router,
  source: string,
  translated: TranslatedRoutePath,
  handler: Core.MiddlewareHandler,
  register: (handler: Core.MiddlewareHandler) => void
) => {
  if (!translatedRouters.has(router)) {
    register(withTranslatedPathMatching(source, translated, handler));
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
 * and a v6 router prefix. Every layer records its path as written, and a layer with a v6 part is
 * matched by its v6 path, including under prefixes and mount paths.
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

    return toPart(prefix, translated);
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

      // A list of paths registers each path through this method, and returns the router.
      if (insideUse === 0 && prefixParts.has(router) && (result as unknown) !== router) {
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
    const pathless = typeof first !== 'string';
    const middlewares = (pathless ? [first, ...rest] : rest).filter(
      (middleware) => typeof middleware === 'function' && !isNestedRouter(middleware)
    );

    insideUse += 1;
    try {
      if (typeof first === 'string') {
        // A nested router's routes may create names of their own, so its mount path's are namespaced.
        const nested = rest.some(isNestedRouter);
        const translated = migrateRouterPath(
          first,
          ['use'],
          strapi,
          nested ? { namespace: nextNamespace('Mount') } : undefined
        );

        mountParts = [toPart(first, translated)];
        result = originalUse(translated.path, ...(rest as never[]));
      } else {
        result = originalUse(first as never, ...(rest as never[]));
      }
    } finally {
      insideUse -= 1;
    }

    // A nested router's layers arrive with their own parts; the prefix and mount path come first.
    (router.stack.slice(before) as TranslatedLayer[]).forEach((layer) => {
      if (pathless && layer.stack.some((middleware) => middlewares.includes(middleware))) {
        layer[LAYER_PATHLESS] = true;
      }

      const head = [...currentPrefixParts(), ...mountParts];
      const own = layer[LAYER_PATHLESS] ? [] : untranslatedRest(layer, head);
      setLayerParts(layer, [...head, ...(layer[LAYER_PARTS] ?? own)]);
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

  // A layer its v6 path rejects is not a path match. Otherwise allowedMethods answers 405.
  router.match = function match(path, method) {
    const result = originalMatch(path, method);

    if (typeof path !== 'string') {
      return result;
    }

    const pathLayers = result.path.filter((layer) => layerAcceptsPath(layer, path));
    const pathAndMethod = result.pathAndMethod.filter((layer) => pathLayers.includes(layer));

    return {
      path: pathLayers,
      pathAndMethod,
      route: pathAndMethod.some((layer) => layer.methods.length > 0),
    };
  } as typeof router.match;
};
