import xssModule from 'xss';

// `xss` is CommonJS: take its members from the default export so the import also links under native ESM.
const { parseTag } = xssModule as unknown as typeof import('xss');

export type RenderMode = 'html' | 'text';

// `{{ name }}` or `{{ user.name }}`. Anything else between braces does not match and stays as it is.
const PLACEHOLDER = /\{\{\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s*\}\}/g;

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

// An attribute of a tag, read from the start of what is left of it: a name and, optionally, a quoted or
// unquoted value (an unquoted one may hold a whole `{{ placeholder }}`, spaces included).
const TAG_HEAD = /^<\/?[^\s>/]*/;
const TAG_ATTRIBUTE =
  /\s*([^\s"'<>/=]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|(?:\{\{[^}]*\}\}|[^\s"'>])+))?/y;
const URL_ATTRIBUTES = new Set(['href', 'src']);
const ALLOWED_SCHEME = /^(?:https?:|mailto:)/i;

// Browsers ignore whitespace and control characters at the start of a URL, so they are skipped before the scheme.
// eslint-disable-next-line no-control-regex
const LEADING_INVISIBLE = /^[\u0000- \u007f-\u009f]+/;

const hasOwn = (target: object, key: string) => Object.prototype.hasOwnProperty.call(target, key);

/** Reads a dotted path through own properties only, so `constructor` or `__proto__` never resolve. */
const readPath = (data: unknown, path: string): unknown => {
  let current = data;

  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object' || !hasOwn(current, segment)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

const stringify = (value: unknown): string => {
  switch (typeof value) {
    case 'string':
      return value;
    case 'number':
    case 'boolean':
    case 'bigint':
      return String(value);
    default:
      return '';
  }
};

/**
 * Fills `{{ path }}` placeholders from `data`. Only paths listed in `variables` are substituted,
 * the rest is sent as literal text. Nothing is evaluated.
 *
 * Values are HTML-escaped in `html` mode and inserted as they are in `text` mode (subject, text).
 */
export const render = (
  source: string,
  variables: readonly string[],
  data: Record<string, unknown>,
  mode: RenderMode
): string => {
  const substitute = (match: string, path: string, escape: boolean) => {
    if (!variables.includes(path)) {
      return match;
    }

    const value = stringify(readPath(data, path));

    return escape ? escapeHtml(value) : value;
  };

  if (mode === 'text') {
    return source.replace(PLACEHOLDER, (match, path: string) => substitute(match, path, false));
  }

  const fill = (text: string) =>
    text.replace(PLACEHOLDER, (match, path: string) => substitute(match, path, true));

  // A link or image address that holds a placeholder is filled in and then kept only when it is an http,
  // https or mailto URL. Tags are split from text by the HTML parser, and the attributes of each tag are read
  // one after the other, so an `href=` inside another attribute's value is never taken for an attribute.
  const fillAttribute = (name: string, equals: string, raw: string): string => {
    const quote = /^["']/.test(raw) ? raw[0] : '';
    const inner = quote ? raw.slice(1, -1) : raw;

    if (!URL_ATTRIBUTES.has(name.toLowerCase())) {
      return `${name}${equals}${quote}${fill(inner)}${quote}`;
    }

    let hasPlaceholder = false;

    const filled = inner.replace(PLACEHOLDER, (placeholder, variable: string) => {
      hasPlaceholder ||= variables.includes(variable);

      return substitute(placeholder, variable, true);
    });

    if (!hasPlaceholder) {
      return `${name}${equals}${raw}`;
    }

    const plain = filled.replace(LEADING_INVISIBLE, '');

    return `${name}${equals}${quote}${ALLOWED_SCHEME.test(plain) ? filled : ''}${quote}`;
  };

  const fillTag = (tag: string): string => {
    const head = TAG_HEAD.exec(tag)?.[0] ?? '';
    let out = fill(head);
    let position = head.length;
    let other = '';

    while (position < tag.length) {
      TAG_ATTRIBUTE.lastIndex = position;
      const found = TAG_ATTRIBUTE.exec(tag);

      if (found === null) {
        other += tag[position];
        position += 1;
      } else {
        const [whole, name, equals, raw] = found;
        const leading = whole.slice(0, whole.length - whole.trimStart().length);

        out += fill(other) + leading;
        other = '';
        out += raw === undefined ? fill(name) : fillAttribute(name, equals, raw);
        position += whole.length;
      }
    }

    return out + fill(other);
  };

  return parseTag(source, (_start, _position, _name, tag) => fillTag(tag), fill);
};

/**
 * Builds sample data for a variable list, e.g. `['user.name']` gives `{ user: { name: '[user.name]' } }`.
 * A variable that stands for a URL (`urls`) gets `https://example.com/<variable>`, a value a link or an image
 * keeps when it is rendered: any other sample would be dropped from an `href` or `src`, and a test email would
 * lose its links.
 */
export const buildSampleData = (
  variables: readonly string[],
  urls: readonly string[] = []
): Record<string, unknown> => {
  const data: Record<string, unknown> = {};

  for (const path of variables) {
    const segments = path.split('.');
    let target = data;

    segments.forEach((segment, index) => {
      if (index === segments.length - 1) {
        target[segment] = urls.includes(path) ? `https://example.com/${path}` : `[${path}]`;
        return;
      }

      const existing = target[segment];
      if (existing === null || typeof existing !== 'object') {
        target[segment] = {};
      }
      target = target[segment] as Record<string, unknown>;
    });
  }

  return data;
};
