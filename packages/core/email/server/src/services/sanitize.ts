import xssModule from 'xss';
import type { IWhiteList } from 'xss';

// `xss` is CommonJS: take its members from the default export (typed as the filter function) so the import
// also links under native ESM.
const {
  FilterXSS,
  escapeAttrValue,
  friendlyAttrValue,
  parseAttr,
  parseTag,
  safeAttrValue: defaultSafeAttrValue,
} = xssModule as unknown as typeof import('xss');

/** Attributes any allowed element may carry. Event handler attributes are never in the list. */
const COMMON_ATTRIBUTES = ['style', 'class', 'dir', 'lang', 'align'];

const ELEMENT_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  table: ['width', 'border', 'cellpadding', 'cellspacing', 'bgcolor'],
  td: ['colspan', 'rowspan', 'width', 'height', 'valign', 'bgcolor'],
  th: ['colspan', 'rowspan', 'width', 'height', 'valign', 'bgcolor'],
  tr: ['valign', 'bgcolor'],
  col: ['span', 'width'],
  colgroup: ['span', 'width'],
  font: ['color', 'size', 'face'],
  ol: ['start', 'type'],
  ul: ['type'],
  li: ['value'],
  hr: ['width'],
  blockquote: ['cite'],
};

const PLAIN_ELEMENTS = [
  'abbr',
  'address',
  'b',
  'big',
  'br',
  'caption',
  'center',
  'cite',
  'code',
  'dd',
  'del',
  'div',
  'dl',
  'dt',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'i',
  'ins',
  'mark',
  'p',
  'pre',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'tbody',
  'tfoot',
  'thead',
  'u',
];

const buildAllowList = (): IWhiteList => {
  const allowList: IWhiteList = {};

  for (const element of PLAIN_ELEMENTS) {
    allowList[element] = [...COMMON_ATTRIBUTES];
  }

  for (const [element, attributes] of Object.entries(ELEMENT_ATTRIBUTES)) {
    allowList[element] = [...COMMON_ATTRIBUTES, ...attributes];
  }

  return allowList;
};

/** Elements dropped together with what they contain. Other elements that are not allowed lose only their tags. */
const STRIPPED_WITH_CONTENT = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'noscript',
  'template',
  'title',
];

const URL_ATTRIBUTES = new Set(['href', 'src']);

/** A `{{ variable }}` placeholder at the start of a value: the value is filled in when the email is sent. */
const LEADING_PLACEHOLDER = /^\{\{\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s*\}\}/;
const ALLOWED_SCHEME = /^(?:https?:|mailto:)/i;
const FORBIDDEN_STYLE = /url\s*\(|expression|@import|javascript:|behaviou?r|binding/i;

/** Browsers ignore whitespace and control characters inside a URL scheme, so they are removed before it is checked. */
const withoutInvisibleCharacters = (value: string) =>
  // eslint-disable-next-line no-control-regex
  value.replace(/[\u0000- \u007f-\u009f]/g, '');

const isAllowedUrl = (value: string, urlVariables: readonly string[]) => {
  const compact = withoutInvisibleCharacters(friendlyAttrValue(value));

  if (ALLOWED_SCHEME.test(compact)) {
    return true;
  }

  const placeholder = LEADING_PLACEHOLDER.exec(compact);

  return placeholder !== null && urlVariables.includes(placeholder[1]);
};

const createFilter = (urlVariables: readonly string[]) =>
  new FilterXSS({
    whiteList: buildAllowList(),
    stripIgnoreTag: true,
    stripIgnoreTagBody: STRIPPED_WITH_CONTENT,
    allowCommentTag: false,
    safeAttrValue(tag, name, value, cssFilter) {
      if (URL_ATTRIBUTES.has(name)) {
        return isAllowedUrl(value, urlVariables) ? escapeAttrValue(friendlyAttrValue(value)) : '';
      }

      if (name === 'style' && FORBIDDEN_STYLE.test(friendlyAttrValue(value))) {
        return '';
      }

      return defaultSafeAttrValue(tag, name, value, cssFilter);
    },
  });

/**
 * Cleans an HTML email body against an allowlist: scripts, frames, objects, embeds, forms, `base`, `meta`,
 * `link` and `style` elements go, so do event handler attributes, and a URL stays only when it is `http:`,
 * `https:` or `mailto:`, or starts with a placeholder for one of `urlVariables` (filled in when the email is
 * sent). A URL that starts with any other placeholder is dropped. Text and `{{ variable }}` placeholders in text
 * are kept as they are.
 */
export const cleanTemplateHtml = (html: string, urlVariables: readonly string[] = []): string =>
  createFilter(urlVariables).process(html);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const placeholderPattern = (name: string) =>
  new RegExp(`\\{\\{\\s*${escapeRegExp(name)}\\s*\\}\\}`, 'g');

/** Counts placeholders as written and as a browser would read them once its HTML entities are decoded. */
const countOccurrences = (source: string, secrets: readonly string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  const decoded = friendlyAttrValue(source);

  for (const secret of secrets) {
    const count = Math.max(
      source.match(placeholderPattern(secret))?.length ?? 0,
      decoded.match(placeholderPattern(secret))?.length ?? 0
    );

    if (count > 0) {
      counts.set(secret, count);
    }
  }

  return counts;
};

/** The secrets a start tag carries somewhere other than the value of an `href` on an `<a>`. */
const misplacedInTag = (tagName: string, tag: string, secrets: readonly string[]): string[] => {
  const inTag = countOccurrences(tag, secrets);

  if (inTag.size === 0) {
    return [];
  }

  if (tagName !== 'a') {
    return [...inTag.keys()];
  }

  const inHref: string[] = [];

  parseAttr(tag.slice(1 + tagName.length, -1), (name, value) => {
    if (name === 'href') {
      inHref.push(value);
    }

    return '';
  });

  const allowed = countOccurrences(inHref.join('\n'), secrets);

  return [...inTag].filter(([secret, count]) => count > (allowed.get(secret) ?? 0)).map(([s]) => s);
};

/**
 * Returns the secret variables that appear in `html` anywhere but in text or in the `href` of a link,
 * for instance in an `img` `src`, a `style` or any other attribute. Secrets are variable names such as `url`.
 */
export const findMisplacedSecrets = (html: string, secrets: readonly string[]): string[] => {
  if (secrets.length === 0) {
    return [];
  }

  const misplaced = new Set<string>();

  parseTag(
    html,
    (_sourcePosition, _position, tagName, tag, isClosing) => {
      if (!isClosing) {
        for (const secret of misplacedInTag(tagName, tag, secrets)) {
          misplaced.add(secret);
        }
      }

      return '';
    },
    (text) => text
  );

  return secrets.filter((secret) => misplaced.has(secret));
};
