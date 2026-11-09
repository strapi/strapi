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

// The value of an `href` or `src` attribute, quoted or not, so a value substituted into it can be checked.
const URL_ATTRIBUTE =
  /(?<![\w-])((?:href|src)\s*=\s*)("[^"]*"|'[^']*'|(?:\{\{[^}]*\}\}|[^\s"'>])+)/gi;
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

  // One pass over the source, so a substituted value is never read as a placeholder again. A link or image
  // address that holds a placeholder is filled in and then kept only when it is an http, https or mailto URL.
  const combined = new RegExp(`${URL_ATTRIBUTE.source}|${PLACEHOLDER.source}`, 'gi');

  return source.replace(
    combined,
    (match: string, prefix?: string, quoted?: string, path?: string) => {
      if (path !== undefined) {
        return substitute(match, path, true);
      }

      if (prefix === undefined || quoted === undefined) {
        return match;
      }

      const quote = /^["']/.test(quoted) ? quoted[0] : '';
      const inner = quote ? quoted.slice(1, -1) : quoted;
      let hasPlaceholder = false;

      const filled = inner.replace(PLACEHOLDER, (placeholder, name: string) => {
        hasPlaceholder ||= variables.includes(name);

        return substitute(placeholder, name, true);
      });

      if (!hasPlaceholder) {
        return match;
      }

      const plain = filled.replace(LEADING_INVISIBLE, '');

      return `${prefix}${quote}${ALLOWED_SCHEME.test(plain) ? filled : ''}${quote}`;
    }
  );
};

/** Builds sample data for a variable list, e.g. `['user.name']` gives `{ user: { name: '[user.name]' } }`. */
export const buildSampleData = (variables: readonly string[]): Record<string, unknown> => {
  const data: Record<string, unknown> = {};

  for (const path of variables) {
    const segments = path.split('.');
    let target = data;

    segments.forEach((segment, index) => {
      if (index === segments.length - 1) {
        target[segment] = `[${path}]`;
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
