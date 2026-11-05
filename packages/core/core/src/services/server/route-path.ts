import type Router from '@koa/router';
import type { Core } from '@strapi/types';
import compose from 'koa-compose';

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

// Constraints live on the layer under a symbol. Koa copies a nested router's layers with
// Object.assign, which keeps symbol properties, so a check survives being mounted under another router.
const CONSTRAINTS = Symbol('strapi.routePath.constraints');

type ConstrainedLayer = RouterLayer & { [CONSTRAINTS]?: RoutePathConstraint[] };

// Constraints from a router prefix such as `/pre/:v(\\d+)`, applied to every route under that router.
const prefixConstraintsByRouter = new WeakMap<Router, RoutePathConstraint[]>();

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

const routeNeedsMatchShim = (translated: TranslatedRoutePath) =>
  translated.constraints.length > 0 ||
  translated.positionalParams.length > 0 ||
  translated.emptyParams.length > 0 ||
  translated.hiddenParams.length > 0;

/**
 * Applies what v8 paths cannot express. A value its pattern rejects means the route did not
 * match, so the request goes on to the next matching route, as it did in v6.
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

export const translateRoutePath = (path: string): TranslatedRoutePath => {
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
    let name = `v6Literal${hiddenCount}`;
    hiddenCount += 1;

    while (paramNames.includes(name)) {
      name = `v6Literal${hiddenCount}`;
      hiddenCount += 1;
    }

    return name;
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
      name = positionalParams.length === 0 ? 'splat' : `splat${positionalParams.length + 1}`;
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

        name = positionalParams.length === 0 ? 'splat' : `splat${positionalParams.length + 1}`;
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

const migrateRouterPath = (
  path: string,
  methods: string[],
  strapi: { log: { warn: (message: string) => void } }
) => {
  const translated = translateRoutePath(path);

  if (translated.changed) {
    const method = methods.map((item) => item.toUpperCase()).join(',');
    strapi.log.warn(
      `Route "${method} ${path}" uses path-to-regexp v6 syntax and was migrated to "${translated.path}".`
    );
  }

  return translated;
};

const wrapRouterHandlers = (middleware: unknown, translated: TranslatedRoutePath) => {
  if (!routeNeedsMatchShim(translated)) {
    return middleware;
  }

  const handlers = (Array.isArray(middleware) ? middleware : [middleware]).filter(
    (handler): handler is Core.MiddlewareHandler => typeof handler === 'function'
  );

  if (handlers.length === 0) {
    return middleware;
  }

  const composed = handlers.length === 1 ? handlers[0] : compose(handlers);
  return withTranslatedPathMatching(translated, composed);
};

const isNestedRouter = (middleware: unknown): middleware is { router: object } =>
  typeof middleware === 'function' &&
  'router' in middleware &&
  (middleware as { router?: unknown }).router !== undefined;

/**
 * Adds the constraints of a translated path to the layers it just registered. A router prefix's
 * constraints are added too, so every route under that router is checked the same way.
 */
export const applyRouteConstraints = (
  router: Router,
  layers: RouterLayer[],
  constraints: RoutePathConstraint[]
) => {
  const all = [...(prefixConstraintsByRouter.get(router) ?? []), ...constraints];

  if (all.length === 0) {
    return;
  }

  layers.forEach((layer) => {
    const constrained = layer as ConstrainedLayer;
    const existing = constrained[CONSTRAINTS] ?? [];
    // `use()` registers through `register()`, so the same constraint can arrive twice.
    constrained[CONSTRAINTS] = [...existing, ...all.filter((item) => !existing.includes(item))];
  });
};

/**
 * Whether a layer accepts a request path. Its constraints are tested against the raw captured
 * text, as v6 did, so `%2F` is not decoded before a `[^/]+` pattern sees it.
 */
const layerAcceptsPath = (layer: ConstrainedLayer, path: string) => {
  const constraints = layer[CONSTRAINTS];

  if (!constraints?.length) {
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

/**
 * Translates v6 paths registered on a Koa router (`use`, `get`/`post`/…, `register`), and a v6
 * router prefix. Route objects already pass through `translateRoutePath` before they reach the
 * router; a v8 path is left unchanged, so this does not translate those twice.
 */
export const installRoutePathTranslation = (
  router: Router,
  strapi: { log: { warn: (message: string) => void } }
) => {
  const originalRegister = router.register.bind(router);
  const originalUse = router.use.bind(router);
  const originalMatch = router.match.bind(router);

  const { prefix } = router.opts;

  if (prefix) {
    const translatedPrefix = translateRoutePath(prefix);

    if (translatedPrefix.changed) {
      strapi.log.warn(
        `Router prefix "${prefix}" uses path-to-regexp v6 syntax and was migrated to "${translatedPrefix.path}".`
      );
    }

    if (
      translatedPrefix.positionalParams.length > 0 ||
      translatedPrefix.emptyParams.length > 0 ||
      translatedPrefix.hiddenParams.length > 0
    ) {
      throw new RoutePathMigrationError(
        prefix,
        'a router prefix supports named parameters with custom patterns only; move the rest into the route paths'
      );
    }

    router.opts.prefix = translatedPrefix.path;
    prefixConstraintsByRouter.set(router, translatedPrefix.constraints);
  }

  router.register = function register(path, methods, middleware, options) {
    // A pathless `use()` asks register for the regexp source `(?:\/|$)` and sets pathAsRegExp.
    if (typeof path !== 'string' || options?.pathAsRegExp) {
      return originalRegister(path, methods, middleware, options);
    }

    const translated = migrateRouterPath(path, methods, strapi);
    const layer = originalRegister(
      translated.path,
      methods,
      wrapRouterHandlers(middleware, translated) as typeof middleware,
      options
    );

    // For a string path, koa-router returns the layer it just added; the `Router` branch is for chaining.
    applyRouteConstraints(router, [layer as RouterLayer], translated.constraints);

    return layer;
  } as typeof router.register;

  router.use = function use(first: unknown, ...rest: unknown[]) {
    const before = router.stack.length;

    if (typeof first !== 'string') {
      const result = originalUse(first as never, ...(rest as never[]));
      applyRouteConstraints(router, router.stack.slice(before), []);
      return result;
    }

    const translated = migrateRouterPath(first, ['use'], strapi);

    // Wrapping `routes()` drops `.router`, so koa-router never mounts the nested stack. Its layers
    // are copied in below, and the mount path's constraints are added to them.
    const mustWrap = routeNeedsMatchShim(translated) && !rest.some(isNestedRouter);
    const result = mustWrap
      ? originalUse(translated.path, wrapRouterHandlers(rest, translated) as Core.MiddlewareHandler)
      : originalUse(translated.path, ...(rest as never[]));

    applyRouteConstraints(router, router.stack.slice(before), translated.constraints);

    return result;
  } as typeof router.use;

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
