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

const isParameterNameCharacter = (character: string | undefined) =>
  character !== undefined && /[A-Za-z0-9_]/.test(character);

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

const makeWildcard = (path: string, name: string) => {
  const wildcard = `{*${name}}`;
  if (path.endsWith('/')) {
    return `${path.slice(0, -1)}/${wildcard}`;
  }

  return wildcard;
};

const translateCustomParameterPatterns = (path: string) => {
  let translated = '';
  let changed = false;
  const constraints: RoutePathConstraint[] = [];

  for (let index = 0; index < path.length; index += 1) {
    if (path[index] !== ':' || !isParameterNameCharacter(path[index + 1])) {
      translated += path[index];
      continue;
    }

    const nameStart = index + 1;
    let nameEnd = nameStart;
    while (isParameterNameCharacter(path[nameEnd])) {
      nameEnd += 1;
    }

    if (path[nameEnd] !== '(') {
      translated += path[index];
      continue;
    }

    const patternEnd = findPatternEnd(path, nameEnd + 1);
    if (patternEnd === -1) {
      throw new RoutePathMigrationError(
        path,
        `the custom pattern for ":${path.slice(nameStart, nameEnd)}" is unclosed`
      );
    }

    const name = path.slice(nameStart, nameEnd);
    const pattern = path.slice(nameEnd + 1, patternEnd);
    changed = true;

    if (pattern === '.*') {
      translated = makeWildcard(translated, name);
    } else {
      try {
        constraints.push({ name, pattern: new RegExp(`^(?:${pattern})$`) });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new RoutePathMigrationError(
          path,
          `the custom pattern for ":${name}" is invalid: ${reason}`
        );
      }
      translated += `:${name}`;
    }

    index = patternEnd;
  }

  return { path: translated, changed, constraints };
};

const translateAnonymousWildcards = (path: string) => {
  let wildcardNumber = 0;
  let changed = false;
  const translated = path.replace(/\(\.\*\)/g, () => {
    wildcardNumber += 1;
    changed = true;
    return `{*splat${wildcardNumber === 1 ? '' : wildcardNumber}}`;
  });

  return { path: translated, changed };
};

const translateModifiers = (path: string) => {
  let changed = false;
  const translated = path.replace(
    /([/.-]?)(:[A-Za-z0-9_]+)([?*+])/g,
    (_, prefix, parameter, modifier) => {
      changed = true;

      if (modifier === '?') {
        return `{${prefix}${parameter}}`;
      }

      if (modifier === '*') {
        return `{${prefix}*${parameter.slice(1)}}`;
      }

      return `${prefix}*${parameter.slice(1)}`;
    }
  );

  return { path: translated, changed };
};

const escapeReservedCharacters = (path: string) => {
  let translated = '';
  let changed = false;

  for (let index = 0; index < path.length; index += 1) {
    const character = path[index];

    if (character === '\\') {
      translated += character;
      if (index + 1 < path.length) {
        translated += path[index + 1];
        index += 1;
      }
      continue;
    }

    if ('()[]?+!'.includes(character)) {
      translated += `\\${character}`;
      changed = true;
    } else {
      translated += character;
    }
  }

  return { path: translated, changed };
};

export const translateRoutePath = (path: string) => {
  const customPatterns = translateCustomParameterPatterns(path);
  const anonymousWildcards = translateAnonymousWildcards(customPatterns.path);
  const modifiers = translateModifiers(anonymousWildcards.path);
  const escaped = escapeReservedCharacters(modifiers.path);

  return {
    path: escaped.path,
    changed:
      customPatterns.changed || anonymousWildcards.changed || modifiers.changed || escaped.changed,
    constraints: customPatterns.constraints,
  };
};
