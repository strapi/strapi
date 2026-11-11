import type Router from '@koa/router';

/**
 * Boots routes written for path-to-regexp v6 on v8.
 * Remove this translator in Strapi 6, when route paths are v8 only.
 *
 * Matching uses path-to-regexp v8. A custom pattern that stays on one parameter is tested against
 * the raw captured text, at that parameter's own position, so a value the pattern rejects is not a
 * match. A pattern that can match `/` becomes a wildcard and is not tested. A negated class that
 * excludes `/`, such as `[^/]+`, stays on one segment and is tested. Parameters with no text
 * between them become one parameter. When each piece stays on one segment, including an optional
 * piece, those patterns are tested against that one value and the pieces are written back.
 * Otherwise the separate values are not recovered.
 */

export class RoutePathMigrationError extends Error {
  constructor(path: string, reason: string) {
    super(`Cannot migrate route path "${path}" from path-to-regexp v6 to v8: ${reason}`);
    this.name = 'RoutePathMigrationError';
  }
}

export type IgnoredRoutePattern = {
  /** The parameter the pattern was written on. Empty when the group had no name. */
  parameter: string;
  pattern: string;
  unnamed: boolean;
};

export type RoutePathSplit = {
  /** Original parameter name. Empty when the group had no name. */
  parameter: string;
  pattern: string;
  unnamed: boolean;
  /** Literal from inside an optional v6 token. It is part of the capture, and absent with the piece. */
  prefix: string;
  /** Literal that followed the parameter inside an optional v6 token. */
  suffix: string;
  /** Set when the v6 parameter was optional, so this piece and its prefix may be absent. */
  optional: boolean;
};

/** A custom pattern tested against one capture of the translated path. */
export type RoutePathConstraint = {
  /** Capture name on the translated path. */
  key: string;
  /** RegExp source for the whole capture. A split pattern has one capturing group per part. */
  pattern: string;
  /** Set when `key` stands for several v6 parameters. Empty when the pattern belongs to `key`. */
  split: RoutePathSplit[];
  /** When false, a capture that v8 left out is still a match. */
  required: boolean;
  /** How many parameters named `key` come before this one on the same path. */
  occurrence: number;
};

export type TranslatedRoutePath = {
  path: string;
  changed: boolean;
  /** Names the v8 path needs that the v6 path does not have. Removed before the handler runs. */
  generatedParams: string[];
  /** Custom patterns the translation does not apply, so the route can match more than it used to. */
  ignoredPatterns: IgnoredRoutePattern[];
  /** Custom patterns applied to captures of the translated path. */
  constraints: RoutePathConstraint[];
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

/**
 * The index of the `]` closing a character class that cannot match `/`, or -1 when it may.
 * A negated class cannot match `/` when `/` is one of the characters it excludes.
 */
const scanSlashFreeClass = (pattern: string, start: number) => {
  let index = start + 1;
  const negated = pattern[index] === '^';
  if (negated) {
    index += 1;
  }

  let previous: number | undefined;
  let inRange = false;
  let excludesSlash = false;

  const slashSeen = () => {
    if (negated) {
      excludesSlash = true;
      return false;
    }

    return true;
  };

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

      // A letter may be a class such as `\D`, and a digit an octal escape such as `\57` for `/`.
      if (
        escaped === undefined ||
        /\d/.test(escaped) ||
        (/[A-Za-z]/.test(escaped) && !(escaped in CONTROL_ESCAPES))
      ) {
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

    if (code === SLASH && slashSeen()) {
      return -1;
    }

    if (inRange) {
      if (
        previous !== undefined &&
        code !== undefined &&
        previous <= SLASH &&
        SLASH <= code &&
        slashSeen()
      ) {
        return -1;
      }
      inRange = false;
      previous = undefined;
      continue;
    }

    previous = code;
  }

  if (index >= pattern.length) {
    return -1;
  }

  return !negated || excludesSlash ? index : -1;
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
        /\d/.test(escaped) ||
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

const translate = (path: string, { namespace }: TranslateOptions): TranslatedRoutePath => {
  let translated = '';
  let changed = false;
  const generatedParams: string[] = [];
  const ignoredPatterns: IgnoredRoutePattern[] = [];
  const constraints: RoutePathConstraint[] = [];
  const recordedPatterns = new Map<
    string,
    { parameter: string; pattern: string; unnamed: boolean; spansSegments: boolean }
  >();
  const usedNames = new Set(
    [...path.matchAll(/[:*]([$\w]+)/g)].map(([, name]) => name).filter(Boolean)
  );
  // Where each parameter was written, so a later parameter can join them.
  const spans: {
    start: number;
    end: number;
    wildcard: boolean;
    joined?: string;
    plain: boolean;
    /** Capture names this span wrote onto the translated path. */
    keys: string[];
    /** Original parameter names this span stands for, in order. */
    sourceKeys: string[];
    /** Literal inside an optional token. A required parameter keeps its prefix outside the span. */
    innerPrefix: string;
    suffix: string;
    /** The v6 `?` or `*` modifier: the prefix is inside the token and the piece may be absent. */
    optional: boolean;
    /** The pattern matches `''`, so v8 wraps the token in braces. The parameter is still required. */
    matchesEmpty: boolean;
    constraint?: Omit<RoutePathConstraint, 'occurrence'>;
  }[] = [];

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

  // A namespaced name holds a `:`. @koa/router only sees parameters in a prefix that contains a `:`,
  // which a prefix of wildcards would not.
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

  /** v8 rejects two parameters with no text between them, so one wildcard stands for both. */
  const hasNoTextBetween = (between: string) => between === '';

  const dropRecorded = (key: string) => {
    const recorded = recordedPatterns.get(key);
    if (!recorded) {
      return;
    }

    recordedPatterns.delete(key);
    ignoredPatterns.push({
      parameter: recorded.unnamed ? '' : recorded.parameter,
      pattern: recorded.pattern,
      unnamed: recorded.unnamed,
    });
  };

  const escapeForRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /** v6's default for a parameter with no custom pattern: one segment, giving the next piece the rest. */
  const PLAIN_PATTERN = '[^/]+?';

  const pieceSource = (piece: RoutePathSplit) => {
    const body = `${escapeForRegExp(piece.prefix)}(${piece.pattern})${escapeForRegExp(piece.suffix)}`;
    return piece.optional ? `(?:${body})?` : body;
  };

  /**
   * Writes `outside`, then the parameter's `text`. Parameters with no text between them become one
   * parameter. When each piece stays on one segment, that parameter keeps the patterns and an
   * optional piece keeps its prefix. Otherwise it is a wildcard.
   */
  const writeParameter = (
    outside: string,
    inside: string,
    text: string,
    wildcard: boolean,
    plain: boolean,
    key: string,
    meta: { innerPrefix: string; suffix: string; optional: boolean; matchesEmpty: boolean } = {
      innerPrefix: '',
      suffix: '',
      optional: false,
      matchesEmpty: false,
    }
  ) => {
    const last = spans.at(-1);

    if (last && hasNoTextBetween(translated.slice(last.end) + outside + inside)) {
      if (last.plain && plain) {
        fail(
          'it is not a valid path-to-regexp v6 path: Must have text between two parameters, missing text after a parameter'
        );
      }

      const chain = [last];
      let start = last.start;
      spans.pop();

      for (
        let before = spans.at(-1);
        before && hasNoTextBetween(translated.slice(before.end, start));
        before = spans.at(-1)
      ) {
        start = before.start;
        chain.unshift(before);
        spans.pop();
      }

      const pieces: RoutePathSplit[] = [];
      let canSplit = !wildcard && chain.every((span) => !span.wildcard);
      const take = (
        sourceKey: string,
        fromWildcard: boolean,
        spanMeta: { innerPrefix: string; suffix: string; optional: boolean; matchesEmpty: boolean },
        plainSpan: boolean
      ) => {
        const recorded = recordedPatterns.get(sourceKey);
        if (fromWildcard || recorded?.spansSegments) {
          canSplit = false;
          return;
        }

        // A plain parameter has v6's one-segment pattern, so it can be split back out.
        if (!recorded) {
          if (!plainSpan) {
            canSplit = false;
            return;
          }

          pieces.push({
            parameter: sourceKey,
            pattern: PLAIN_PATTERN,
            unnamed: false,
            prefix: spanMeta.innerPrefix,
            suffix: spanMeta.suffix,
            optional: spanMeta.optional,
          });
          return;
        }

        pieces.push({
          parameter: recorded.unnamed ? '' : recorded.parameter,
          pattern: recorded.pattern,
          unnamed: recorded.unnamed,
          prefix: spanMeta.innerPrefix,
          suffix: spanMeta.suffix,
          optional: spanMeta.optional,
        });
      };

      for (const span of chain) {
        if (span.constraint) {
          if (span.wildcard) {
            canSplit = false;
          } else {
            pieces.push(...span.constraint.split);
          }
        } else {
          span.sourceKeys.forEach((sourceKey) => take(sourceKey, span.wildcard, span, span.plain));
        }
      }
      take(key, wildcard, meta, plain);

      const joined = chain.find((span) => span.joined)?.joined ?? generateName('Joined');
      changed = true;
      // Quote the name so the next character cannot become part of it.
      const quoted = `"${joined.replace(/["\\]/g, '\\$&')}"`;

      if (
        canSplit &&
        pieces.length === chain.reduce((count, span) => count + span.sourceKeys.length, 0) + 1
      ) {
        for (const span of chain) {
          span.sourceKeys.forEach((sourceKey) => recordedPatterns.delete(sourceKey));
        }
        recordedPatterns.delete(key);

        // An optional piece can match with or without its prefix, including glued to the text before it.
        const anyOptional = pieces.some((piece) => piece.optional);
        const constraint = {
          key: joined,
          pattern: pieces.map((piece) => pieceSource(piece)).join(''),
          split: pieces,
          required: pieces.some((piece) => !piece.optional),
        };
        translated = `${translated.slice(0, start)}${anyOptional ? `{*${quoted}}` : `:${quoted}`}`;
        spans.push({
          start,
          end: translated.length,
          wildcard: false,
          joined,
          plain: false,
          keys: [joined],
          sourceKeys: pieces.map((piece) => piece.parameter),
          innerPrefix: '',
          suffix: '',
          optional: anyOptional,
          matchesEmpty: false,
          constraint,
        });
        return;
      }

      for (const span of chain) {
        if (span.constraint) {
          span.constraint.split.forEach((piece) => {
            ignoredPatterns.push({
              parameter: piece.parameter,
              pattern: piece.pattern,
              unnamed: piece.unnamed,
            });
          });
        } else {
          span.sourceKeys.forEach((sourceKey) => dropRecorded(sourceKey));
        }
      }
      dropRecorded(key);

      translated = `${translated.slice(0, start)}{*${quoted}}`;
      spans.push({
        start,
        end: translated.length,
        wildcard: true,
        joined,
        plain: false,
        keys: [joined],
        sourceKeys: [joined],
        innerPrefix: '',
        suffix: '',
        optional: false,
        matchesEmpty: false,
      });
      return;
    }

    translated += outside;
    const start = translated.length;
    translated += text;
    spans.push({
      start,
      end: translated.length,
      wildcard,
      plain,
      keys: [key],
      sourceKeys: [key],
      innerPrefix: meta.innerPrefix,
      suffix: meta.suffix,
      optional: meta.optional,
      matchesEmpty: meta.matchesEmpty,
    });
  };

  const detachOptionalPrefix = () => {
    const last = translated.at(-1);
    if (last !== undefined && OPTIONAL_PREFIXES.has(last) && translated.at(-2) !== '\\') {
      translated = translated.slice(0, -1);
      if ((spans.at(-1)?.end ?? 0) > translated.length) {
        spans.pop();
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
    nextCharacter: string | undefined,
    unnamed = false
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

    if ((modifier === '+' || modifier === '*') && prefix === '' && suffix === '') {
      fail(`Can not repeat "${name}" without a prefix and suffix`);
    }

    const quoted = formatParameterName(name, suffix[0] ?? nextCharacter);
    const plain = pattern === undefined;
    const repeated = modifier === '*' || modifier === '+';
    const spansSegments = repeated || (pattern !== undefined && patternMayMatchSlash(pattern));

    // `.*` becomes a wildcard that matches the same text, including an empty capture.
    // The map key is unique per occurrence, so two `:id` parameters do not share one pattern.
    let recordKey = name;
    if (pattern !== undefined && pattern !== '.*') {
      recordKey = `${name}\u0000${recordedPatterns.size}`;
      recordedPatterns.set(recordKey, { parameter: name, pattern, unnamed, spansSegments });
    }
    const token = `${spansSegments ? '*' : ':'}${quoted}`;
    const escapedPrefix = escapeLiteral(prefix);
    const escapedSuffix = escapeLiteral(suffix);

    if (modifier === '?' || modifier === '*') {
      writeParameter(
        '',
        escapedPrefix,
        `{${escapedPrefix}${token}${escapedSuffix}}`,
        spansSegments,
        plain,
        recordKey,
        { innerPrefix: prefix, suffix, optional: true, matchesEmpty: false }
      );
      return;
    }

    // A v8 parameter matches at least one character, and a pattern such as `.*` may match none.
    if (pattern !== undefined && new RegExp(`^(?:${pattern})$`, 'i').test('')) {
      writeParameter(
        escapedPrefix,
        '',
        `{${token}}${escapedSuffix}`,
        spansSegments,
        plain,
        recordKey,
        {
          innerPrefix: '',
          suffix: '',
          optional: false,
          matchesEmpty: true,
        }
      );
      return;
    }

    writeParameter(escapedPrefix, '', `${token}${escapedSuffix}`, spansSegments, plain, recordKey);
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
    const rawName = generateName('Literal');
    const name = formatParameterName(rawName, undefined);
    const token = literal.includes('/') ? `*${name}` : `:${name}`;
    writeParameter(
      '',
      '',
      group.modifier === '*' ? `{${token}}` : token,
      token.startsWith('*'),
      false,
      rawName
    );
  };

  const failOnLookaround = (pattern: string | undefined) => {
    if (pattern?.startsWith('?')) {
      fail(`the group "(${pattern})" has no v8 equivalent, split the route or name the parameter`);
    }
  };

  // v6 rejected a capturing group inside a custom pattern, with the same scan: only `\` escapes.
  // Keeping that rule stops a nested quantifier such as `((a+)+)` from booting.
  const failOnCapturingGroup = (pattern: string | undefined) => {
    if (pattern === undefined) {
      return;
    }

    for (let index = 0; index < pattern.length; index += 1) {
      if (pattern[index] === '\\') {
        index += 1;
      } else if (pattern[index] === '(' && pattern[index + 1] !== '?') {
        fail(
          `it is not a valid path-to-regexp v6 path: Capturing groups are not allowed in the custom pattern "(${pattern})"`
        );
      }
    }
  };

  const emitGroup = (group: V6Group) => {
    changed = true;
    failOnLookaround(group.pattern);
    failOnCapturingGroup(group.pattern);

    if (!group.name && group.pattern === undefined) {
      emitLiteralGroup(group);
      return;
    }

    const name = group.name || generateName('Group');
    addParameter(
      name,
      group.pattern,
      group.modifier,
      group.prefix,
      group.suffix,
      path[group.end],
      !group.name
    );
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
      failOnCapturingGroup(pattern);

      if (isParameter && pattern === undefined && !modifier) {
        writeParameter('', '', `:${formatParameterName(name, path[cursor])}`, false, true, name);
      } else {
        changed = true;
        addParameter(
          name,
          pattern,
          modifier,
          detachOptionalPrefix(),
          '',
          path[cursor],
          !isParameter
        );
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

  if (changed && /[:*]"/.test(path)) {
    fail(
      'it is not a valid path-to-regexp v6 path: it mixes path-to-regexp v6 syntax with syntax only v8 accepts'
    );
  }

  const seenNames = new Map<string, number>();
  const nextOccurrence = (name: string) => {
    const occurrence = seenNames.get(name) ?? 0;
    seenNames.set(name, occurrence + 1);
    return occurrence;
  };

  for (const span of spans) {
    if (span.constraint) {
      constraints.push({ ...span.constraint, occurrence: nextOccurrence(span.constraint.key) });
      continue;
    }

    for (const key of span.keys) {
      const recorded = recordedPatterns.get(key);
      const occurrence = nextOccurrence(recorded?.parameter ?? key);
      if (!recorded) {
        continue;
      }

      recordedPatterns.delete(key);
      if (span.wildcard || recorded.spansSegments) {
        ignoredPatterns.push({
          parameter: recorded.unnamed ? '' : recorded.parameter,
          pattern: recorded.pattern,
          unnamed: recorded.unnamed,
        });
      } else {
        constraints.push({
          key: recorded.parameter,
          pattern: recorded.pattern,
          split: [],
          required: !span.optional && !span.matchesEmpty,
          occurrence,
        });
      }
    }
  }

  return { path: translated, changed, generatedParams, ignoredPatterns, constraints };
};

export const translateRoutePath = (
  path: string,
  options: TranslateOptions = {}
): TranslatedRoutePath => translate(path, options);

type ParamsContext = { params: Record<string | number, unknown>; path: string };

type Logger = { log: { warn: (message: string) => void } };

/**
 * Set on a route object to keep its v6 path without a boot warning. For Strapi's own routes, whose
 * v6 paths stay as they were so `ctx.params` and the API documentation do not change.
 */
export const KEEP_V6_ROUTE_PATH = Symbol.for('strapi.route.keepV6Path');

/**
 * Logs the migration, and a separate warning for each custom pattern the translation drops.
 * A dropped pattern is not a constraint anymore, so the route can catch a later route.
 */
export const warnTranslatedRoutePath = (
  strapi: Logger,
  subject: string,
  translated: TranslatedRoutePath,
  kind: 'route' | 'prefix' = 'route'
) => {
  if (!translated.changed) {
    return;
  }

  strapi.log.warn(
    `${subject} uses path-to-regexp v6 syntax and was migrated to "${translated.path}".`
  );

  const caughtBy = kind === 'prefix' ? 'This prefix' : 'This route';

  for (const ignored of translated.ignoredPatterns) {
    const target = ignored.unnamed ? 'an unnamed group' : `\`:${ignored.parameter}\``;
    strapi.log.warn(
      `${subject}: pattern \`${ignored.pattern}\` on ${target} is no longer enforced. ${caughtBy} may now match requests meant for later routes.`
    );
  }
};

const migrateRouterPath = (
  path: string,
  methods: string[],
  strapi: Logger,
  options?: TranslateOptions
) => {
  const translated = translateRoutePath(path, options);
  const method = methods.map((item) => item.toUpperCase()).join(',');

  warnTranslatedRoutePath(strapi, `Route "${method} ${path}"`, translated);

  return translated;
};

/** One piece of a layer's path, as written and as translated: a router prefix, a mount path or a route. */
type RoutePathPart = {
  source: string;
  path: string;
  generatedParams: string[];
  constraints: RoutePathConstraint[];
};

// State lives on the layer under symbols. Koa copies a nested router's layers with Object.assign,
// which keeps symbol properties, so it survives being mounted under another router.
const LAYER_PARTS = Symbol('strapi.routePath.parts');
const LAYER_PATHLESS = Symbol('strapi.routePath.pathless');
const LAYER_SHIM = Symbol('strapi.routePath.shim');
const LAYER_CONSTRAINTS = Symbol('strapi.routePath.constraints');

type CompiledConstraint = {
  key: string;
  regexp: RegExp;
  split: RoutePathSplit[];
  required: boolean;
  /** Position among the layer's parameters named `key`, prefix and mount path included. */
  occurrence: number;
  /** For each parameter named `key` on the layer, in order, whether it can be left out. */
  optional: boolean[];
};

type TranslatedLayer = RouterLayer & {
  [LAYER_PARTS]?: RoutePathPart[];
  [LAYER_PATHLESS]?: boolean;
  [LAYER_CONSTRAINTS]?: CompiledConstraint[];
  regexp?: RegExp;
  match: (path: string) => boolean;
  params: (
    path: string,
    captures: readonly string[],
    existing: Record<string, unknown>
  ) => Record<string, unknown>;
  captures: (path: string) => string[];
};
type LayerMiddleware = RouterLayer['stack'][number];
type ShimContext = ParamsContext & {
  captures?: string[];
  routerPath?: string;
  newRouterPath?: string;
  _matchedRoute?: string;
};

const toPart = (source: string, translated: TranslatedRoutePath): RoutePathPart => ({
  source,
  path: translated.path,
  generatedParams: translated.generatedParams,
  constraints: translated.constraints,
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

const GROUP_PARAM_NAME = /Group\d+$/;

/** v8 gives a wildcard as a list of segments. v6 gave the same value as one string. */
const paramText = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.join('/');
  }

  return typeof value === 'string' ? value : undefined;
};

/**
 * Runs first in a layer's stack. Drops names the translation created, numbers unnamed groups from
 * 0, splits a joined capture back into the parameters it stands for, and reports the route as
 * written in `_matchedRoute`. Custom patterns are applied by `layer.match`, before this runs.
 */
const createLayerShim = (layer: TranslatedLayer): LayerMiddleware => {
  const shim = (ctx: ShimContext, next: () => Promise<unknown>) => {
    // A copy of the layer that a router without path translation mounted runs this shim too.
    if (ctx.routerPath !== layer.path) {
      return next();
    }

    const generated = (layer[LAYER_PARTS] ?? []).flatMap((part) => part.generatedParams);
    const splits = new Map(
      (layer[LAYER_CONSTRAINTS] ?? [])
        .filter((constraint) => constraint.split.length > 0)
        .map((constraint) => [constraint.key, constraint])
    );
    let group = 0;

    for (const name of generated) {
      const split = splits.get(name);
      if (split) {
        const raw = constraintValue(layer, layer.captures(ctx.path), split);
        const found = raw ? split.regexp.exec(raw) : null;
        if (found) {
          for (const [index, part] of split.split.entries()) {
            const piece = found[index + 1];
            if (!piece) {
              continue;
            }

            const decoded = decodeParam(piece);
            if (part.unnamed) {
              ctx.params[group] = decoded;
              group += 1;
            } else {
              ctx.params[part.parameter] = decoded;
            }
          }
        }

        delete ctx.params[name];
        continue;
      }

      const value = paramText(ctx.params[name]);

      if (GROUP_PARAM_NAME.test(name) && value) {
        ctx.params[group] = value;
        group += 1;
      }

      delete ctx.params[name];
    }

    for (const name of Object.keys(ctx.params)) {
      const value = paramText(ctx.params[name]);

      if (!value) {
        delete ctx.params[name];
      } else if (Array.isArray(ctx.params[name])) {
        ctx.params[name] = value;
      }
    }

    ctx._matchedRoute = getRouteSourcePath(layer);

    return next();
  };

  return Object.assign(shim, { [LAYER_SHIM]: true }) as unknown as LayerMiddleware;
};

const isShim = (middleware: LayerMiddleware) =>
  (middleware as unknown as { [LAYER_SHIM]?: boolean })[LAYER_SHIM] === true;

const decodeParam = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** The parameter names in a v8 path, in order, and whether each sits inside an optional `{…}`. */
const scanPathParams = (path: string) => {
  const params: { name: string; optional: boolean }[] = [];
  let depth = 0;

  for (let index = 0; index < path.length; index += 1) {
    const character = path[index];

    if (character === '\\') {
      index += 1;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
    } else if ((character === ':' || character === '*') && path[index + 1] === '"') {
      const end = readQuotedNameEnd(path, index + 1);
      params.push({
        name: path.slice(index + 2, end - 1).replace(/\\(.)/g, '$1'),
        optional: depth > 0,
      });
      index = end - 1;
    } else if (character === ':' || character === '*') {
      const characters = Array.from(path.slice(index + 1));
      let name = '';
      for (const [position, next] of characters.entries()) {
        if (!(position === 0 ? ID_START : ID_CONTINUE).test(next)) {
          break;
        }
        name += next;
      }

      if (name) {
        params.push({ name, optional: depth > 0 });
        index += name.length;
      }
    }
  }

  return params;
};

const compileConstraints = (
  layer: TranslatedLayer,
  parts: RoutePathPart[]
): CompiledConstraint[] => {
  const flags = layer.regexp instanceof RegExp && layer.regexp.flags.includes('i') ? 'i' : '';
  const optional = new Map<string, boolean[]>();
  const compiled: CompiledConstraint[] = [];

  for (const part of parts) {
    const before = new Map([...optional].map(([name, flagsSoFar]) => [name, flagsSoFar.length]));

    for (const param of scanPathParams(part.path)) {
      optional.set(param.name, [...(optional.get(param.name) ?? []), param.optional]);
    }

    for (const constraint of part.constraints) {
      compiled.push({
        key: constraint.key,
        regexp: new RegExp(`^(?:${constraint.pattern})$`, flags),
        split: constraint.split,
        required: constraint.required,
        occurrence: (before.get(constraint.key) ?? 0) + constraint.occurrence,
        optional: [],
      });
    }
  }

  for (const constraint of compiled) {
    constraint.optional = optional.get(constraint.key) ?? [];
  }

  return compiled;
};

/**
 * The raw text a constraint applies to. v8 writes one alternative per combination of optional
 * groups, each with its own captures, so the value is found among the captures that matched.
 */
const constraintValue = (
  layer: TranslatedLayer,
  captures: readonly (string | null | undefined)[],
  constraint: CompiledConstraint
) => {
  const names = layer.paramNames ?? [];
  const present = captures.filter(
    (value, index) => value != null && names[index]?.name === constraint.key
  ) as string[];

  if (present.length === constraint.optional.length) {
    return present[constraint.occurrence];
  }

  // A parameter that is left out is optional. With only the required ones present, skip the rest.
  const required = constraint.optional.flatMap((isOptional, index) => (isOptional ? [] : [index]));
  if (present.length === required.length) {
    const position = required.indexOf(constraint.occurrence);
    return position === -1 ? undefined : present[position];
  }

  return present[constraint.occurrence];
};

/**
 * A translated path is only a candidate. `layer.match` still rejects a capture whose custom
 * pattern does not match, so a later route can run and another method stays 404.
 */
const installConstraintMatch = (layer: TranslatedLayer) => {
  const prototype = Object.getPrototypeOf(layer) as Partial<TranslatedLayer>;
  const prototypeMatch = prototype.match;
  const prototypeCaptures = prototype.captures;
  const constraints = layer[LAYER_CONSTRAINTS] ?? [];

  if (
    typeof prototypeMatch !== 'function' ||
    typeof prototypeCaptures !== 'function' ||
    constraints.length === 0
  ) {
    if (typeof prototypeMatch === 'function') {
      layer.match = prototypeMatch;
    }
    if (typeof prototypeCaptures === 'function') {
      layer.captures = prototypeCaptures;
    }
    return;
  }

  const alternatives = new WeakMap<RegExp, RegExpAlternative[]>();

  const passes = (current: TranslatedLayer, captures: readonly (string | null | undefined)[]) =>
    (current[LAYER_CONSTRAINTS] ?? []).every((constraint) => {
      const value = constraintValue(current, captures, constraint);
      if (value == null) {
        return !constraint.required;
      }

      return constraint.regexp.test(value);
    });

  // Raw captures, in parameter order, of the first v8 alternative whose values pass. v6 found the
  // same match by backtracking into its optional groups.
  const constrainedCaptures = (current: TranslatedLayer, path: string) => {
    const { regexp } = current;
    const found = regexp ? regexp.exec(path) : null;
    if (!regexp || !found) {
      return null;
    }

    const captures: (string | undefined)[] = found.slice(1);
    if (passes(current, captures)) {
      return captures;
    }

    if (!alternatives.has(regexp)) {
      alternatives.set(regexp, splitAlternatives(regexp));
    }

    for (const alternative of alternatives.get(regexp) ?? []) {
      const match = alternative.regexp.exec(path);
      if (!match) {
        continue;
      }

      const candidate = captures.map(() => undefined as string | undefined);
      match.slice(1).forEach((value, index) => {
        candidate[alternative.offset + index] = value;
      });
      if (passes(current, candidate)) {
        return candidate;
      }
    }

    return null;
  };

  layer.match = function match(this: TranslatedLayer, path: string) {
    return prototypeMatch.call(this, path) && constrainedCaptures(this, path) !== null;
  };

  layer.captures = function captures(this: TranslatedLayer, path: string) {
    const prototypeValue = prototypeCaptures.call(this, path);
    if (prototypeValue.length === 0) {
      return prototypeValue;
    }

    return (constrainedCaptures(this, path) ?? prototypeValue) as string[];
  };
};

type RegExpAlternative = { regexp: RegExp; offset: number };

/**
 * v8 compiles optional groups to `^(?:all|fewer|…)tail`, one alternative per combination. Returns
 * each alternative as its own regexp, with the index of its first capture in the full match.
 */
const splitAlternatives = (regexp: RegExp): RegExpAlternative[] => {
  const { source, flags } = regexp;
  if (!source.startsWith('^(?:')) {
    return [];
  }

  const bodies: { body: string; captures: number }[] = [];
  let depth = 0;
  let start = 4;
  let captures = 0;
  let inClass = false;

  for (let index = 4; index < source.length; index += 1) {
    const character = source[index];

    if (character === '\\') {
      index += 1;
    } else if (inClass) {
      inClass = character !== ']';
    } else if (character === '[') {
      inClass = true;
    } else if (character === '(') {
      depth += 1;
      if (source[index + 1] !== '?') {
        captures += 1;
      }
    } else if (character === ')' && depth > 0) {
      depth -= 1;
    } else if ((character === '|' || character === ')') && depth === 0) {
      bodies.push({ body: source.slice(start, index), captures });
      captures = 0;
      start = index + 1;

      if (character === ')') {
        const tail = source.slice(index + 1);
        let offset = 0;

        return bodies.length < 2
          ? []
          : bodies.map((alternative) => {
              const compiled = {
                regexp: new RegExp(`^(?:${alternative.body})${tail}`, flags),
                offset,
              };
              offset += alternative.captures;
              return compiled;
            });
      }
    }
  }

  return [];
};

const setLayerParts = (layer: TranslatedLayer, parts: RoutePathPart[]) => {
  layer[LAYER_PARTS] = parts;
  layer[LAYER_CONSTRAINTS] = compileConstraints(layer, parts);
  installConstraintMatch(layer);

  // A copied layer still holds the shim of the layer it was copied from, so it gets its own.
  const stack = layer.stack.filter((middleware) => !isShim(middleware));
  layer.stack = parts.some(isTranslatedPart) ? [createLayerShim(layer), ...stack] : stack;
};

/** A layer from a router without path translation: its path after `head`, as a part of its own. */
const untranslatedRest = (layer: TranslatedLayer, head: RoutePathPart[]): RoutePathPart[] => {
  const start = head.map((part) => part.path).join('');

  if (typeof layer.path !== 'string' || !layer.path.startsWith(start)) {
    return [];
  }

  const rest = layer.path.slice(start.length);
  return rest ? [{ source: rest, path: rest, generatedParams: [], constraints: [] }] : [];
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
 * Registers a translated route object, so the layer records the path as written. A v6 path needs
 * path translation on its router, so it is installed on a router that does not have it yet.
 */
export const registerTranslatedRoute = (
  router: Router,
  strapi: Logger,
  source: string,
  translated: TranslatedRoutePath,
  register: () => void
) => {
  if (!translated.changed && !translatedRouters.has(router)) {
    register();
    return;
  }

  if (!translatedRouters.has(router)) {
    installRoutePathTranslation(router, strapi);
  }

  pendingRoute = { source, translated };
  try {
    register();
  } finally {
    pendingRoute = undefined;
  }
};

/**
 * Translates v6 paths registered on a Koa router (`use`, `get`/`post`/…, `register`, `prefix`),
 * and a v6 router prefix. Every layer records its path as written. Matching is path-to-regexp v8.
 */
export const installRoutePathTranslation = (router: Router, strapi: Logger) => {
  const originalRegister = router.register.bind(router);
  const originalUse = router.use.bind(router);
  const originalPrefix = router.prefix.bind(router);

  translatedRouters.add(router);

  const translatePrefix = (prefix: string) => {
    const translated = translateRoutePath(prefix, { namespace: nextNamespace('Prefix') });

    warnTranslatedRoutePath(strapi, `Router prefix "${prefix}"`, translated, 'prefix');

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
        setLayerParts(result as TranslatedLayer, currentPrefixParts());
      }

      return result;
    }

    const pending = pendingRoute?.translated.path === path ? pendingRoute : undefined;
    pendingRoute = undefined;

    const translated = pending?.translated ?? migrateRouterPath(path, methods, strapi);
    const source = pending?.source ?? path;

    // For a string path, koa-router returns the layer it just added; the `Router` branch is for chaining.
    const layer = originalRegister(
      translated.path,
      methods,
      middleware,
      options
    ) as TranslatedLayer;
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
    const middlewares = new Set(
      (pathless ? [first, ...rest] : rest).filter(
        (middleware) => typeof middleware === 'function' && !isNestedRouter(middleware)
      )
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
      if (pathless && layer.stack.some((middleware) => middlewares.has(middleware))) {
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
};
