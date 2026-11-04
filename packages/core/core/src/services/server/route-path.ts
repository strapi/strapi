import type Router from '@koa/router';
import type { Core } from '@strapi/types';
import compose from 'koa-compose';

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
  /** Required parameters whose pattern matches nothing, which v6 set to `""` instead of leaving out. */
  emptyParams: string[];
  /**
   * Parameters created only so a repeated v6 literal can be checked. Removed before the handler runs.
   */
  hiddenParams: string[];
};

// v6 only made `/` and `.` optional along with a parameter.
const OPTIONAL_PREFIXES = new Set(['/', '.']);

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
 * Errs towards yes: a wildcard plus the pattern as a constraint still matches the same paths.
 */
const canMatchSlash = (pattern: string) => {
  let inCharacterClass = false;
  let isNegated = false;
  let classHasSlash = false;

  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];

    if (character === '\\') {
      const escaped = pattern[index + 1] ?? '';
      const matchesSlash = ['/', 'W', 'S', 'D'].includes(escaped);
      index += 1;

      if (inCharacterClass) {
        classHasSlash ||= matchesSlash;
      } else if (matchesSlash) {
        return true;
      }
      continue;
    }

    if (inCharacterClass) {
      if (character === ']') {
        inCharacterClass = false;
        if (isNegated !== classHasSlash) {
          return true;
        }
      } else if (character === '/') {
        classHasSlash = true;
      }
      continue;
    }

    if (character === '[') {
      inCharacterClass = true;
      isNegated = pattern[index + 1] === '^';
      classHasSlash = false;
      if (isNegated) {
        index += 1;
      }
      continue;
    }

    if (character === '.' || character === '/') {
      return true;
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

const routeNeedsMatchShim = (translated: TranslatedRoutePath) =>
  translated.constraints.length > 0 ||
  translated.positionalParams.length > 0 ||
  translated.emptyParams.length > 0 ||
  translated.hiddenParams.length > 0;

const parameterText = (value: unknown) => (Array.isArray(value) ? value.join('/') : String(value));

/**
 * Applies what v8 paths cannot express. A value its pattern rejects means the route did not
 * match, so the request goes on to the next matching route, as it did in v6.
 */
export const withTranslatedPathMatching = (
  { constraints, positionalParams, paramNames, emptyParams, hiddenParams }: TranslatedRoutePath,
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

    const fails = ({ name, pattern }: RoutePathConstraint) =>
      ctx.params[name] !== undefined && !pattern.test(parameterText(ctx.params[name]));

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
      matcher = new RegExp(`^${body}$`);
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
      pattern: new RegExp(`^(?:${escapeRegExp(literal)})${group.modifier === '*' ? '*' : '+'}$`),
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

    // v8 wildcards, such as `/*path`, were invalid in v6.
    if (character === '*' && isParameterNameCharacter(path[index + 1])) {
      translated += character;
      continue;
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

/**
 * Translates v6 paths registered on the Koa router itself (`use`, `get`/`post`/…, `register`).
 * Route objects already pass through `translateRoutePath` before they reach the router; a v8 path
 * is left unchanged, so this does not translate those twice.
 */
export const installRoutePathTranslation = (
  router: Router,
  strapi: { log: { warn: (message: string) => void } }
) => {
  const originalRegister = router.register.bind(router);
  const originalUse = router.use.bind(router);

  router.register = function register(path, methods, middleware, options) {
    if (typeof path !== 'string') {
      return originalRegister(path, methods, middleware, options);
    }

    const translated = migrateRouterPath(path, methods, strapi);

    return originalRegister(
      translated.path,
      methods,
      wrapRouterHandlers(middleware, translated) as typeof middleware,
      options
    );
  } as typeof router.register;

  router.use = function use(first: unknown, ...rest: unknown[]) {
    if (typeof first !== 'string') {
      return originalUse(first as never, ...(rest as never[]));
    }

    const translated = migrateRouterPath(first, ['use'], strapi);

    if (!routeNeedsMatchShim(translated)) {
      return originalUse(translated.path, ...(rest as never[]));
    }

    return originalUse(
      translated.path,
      wrapRouterHandlers(rest, translated) as Core.MiddlewareHandler
    );
  } as typeof router.use;
};
