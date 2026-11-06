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
  return source.replace(PLACEHOLDER, (match, path: string) => {
    if (!variables.includes(path)) {
      return match;
    }

    const value = stringify(readPath(data, path));

    return mode === 'html' ? escapeHtml(value) : value;
  });
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
