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
};

// v6 only made `/` and `.` optional along with a parameter.
const OPTIONAL_PREFIXES = ['/', '.'];

const isParameterNameCharacter = (character: string | undefined) =>
  character !== undefined && /[A-Za-z0-9_]/.test(character);

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

/** An alternation outside any nested group, such as `a|b`. */
const hasTopLevelAlternation = (pattern: string) => {
  let depth = 0;
  let inCharacterClass = false;

  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];

    if (character === '\\') {
      index += 1;
    } else if (inCharacterClass) {
      inCharacterClass = character !== ']';
    } else if (character === '[') {
      inCharacterClass = true;
    } else if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
    } else if (character === '|' && depth === 0) {
      return true;
    }
  }

  return false;
};

export const translateRoutePath = (path: string): TranslatedRoutePath => {
  let translated = '';
  let changed = false;
  const constraints: RoutePathConstraint[] = [];
  const positionalParams: string[] = [];
  const paramNames: string[] = [];

  const fail = (reason: string): never => {
    throw new RoutePathMigrationError(path, reason);
  };

  const takeOptionalPrefix = () => {
    const last = translated.at(-1);
    if (last !== undefined && OPTIONAL_PREFIXES.includes(last) && translated.at(-2) !== '\\') {
      translated = translated.slice(0, -1);
      return last;
    }

    return '';
  };

  const addParameter = (name: string, pattern: string | undefined, modifier: string) => {
    paramNames.push(name);

    if (pattern === undefined) {
      if (modifier === '?') {
        const prefix = takeOptionalPrefix();
        translated += `{${prefix}:${name}}`;
      } else if (modifier === '*') {
        const prefix = takeOptionalPrefix();
        translated += `{${prefix}*${name}}`;
      } else if (modifier === '+') {
        translated += `*${name}`;
      } else {
        translated += `:${name}`;
      }
      return;
    }

    if (modifier === '*' || modifier === '+') {
      fail(`the repeated parameter ":${name}" has a custom pattern`);
    }

    let matcher: RegExp;
    try {
      matcher = new RegExp(`^(?:${pattern})$`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return fail(`the custom pattern for ":${name}" is invalid: ${reason}`);
    }

    if (pattern !== '.*') {
      constraints.push({ name, pattern: matcher });
    }

    const token = canMatchSlash(pattern) ? `*${name}` : `:${name}`;

    if (modifier === '?') {
      const prefix = takeOptionalPrefix();
      translated += `{${prefix}${token}}`;
    } else if (matcher.test('')) {
      translated += `{${token}}`;
    } else {
      translated += token;
    }
  };

  for (let index = 0; index < path.length; index += 1) {
    const character = path[index];

    if (character === '\\') {
      translated += path.slice(index, index + 2);
      index += 1;
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

      const modifier = '?*+'.includes(path[cursor] ?? '') ? path[cursor] : '';
      if (modifier) {
        cursor += 1;
      }

      if (!isParameter && pattern !== undefined) {
        if (pattern.startsWith('?') || hasTopLevelAlternation(pattern)) {
          fail(
            `the group "(${pattern})" has no v8 equivalent, split the route or name the parameter`
          );
        }

        name = positionalParams.length === 0 ? 'splat' : `splat${positionalParams.length + 1}`;
        positionalParams.push(name);
      }

      if (isParameter && pattern === undefined && !modifier) {
        paramNames.push(name);
        translated += `:${name}`;
      } else {
        changed = true;
        addParameter(name, pattern, modifier);
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

  return { path: translated, changed, constraints, positionalParams, paramNames };
};
