import DOMPurify from 'dompurify';

/**
 * Attribute allowlist. Starts from the prior sanitize-html configuration:
 *   '*':    href, align, alt, center, width, height, type, controls, target
 *   img:    src, alt
 *   source: src, type
 *
 * DOMPurify's ALLOWED_ATTR is a flat list (no per-tag scoping), so the union
 * of the original allowlist is used. Tags that the prior config never reached
 * (script, iframe, etc.) are stripped wholesale by DOMPurify's default tag
 * allowlist, so per-tag attribute scoping is not security-relevant here.
 *
 * `class` and `title` are additions over the old config (which stripped both):
 *   - class: mdRenderer.ts emits `hljs`/`language-*` on code blocks (so the
 *     highlight.js solarized-dark stylesheet applies) and `footnote-ref`/
 *     `footnote-backref` on footnotes. Stripping it left those styles dead.
 *   - title: link/image tooltips and the markdown-it abbr plugin (`<abbr title>`).
 * Both are inert in admin-authored content behind the tag allowlist; neither
 * can escalate.
 */
const ALLOWED_ATTR = [
  'href',
  'src',
  'alt',
  'align',
  'center',
  'width',
  'height',
  'type',
  'controls',
  'target',
  'class',
  'title',
];

/**
 * URL scheme allowlist: http(s), ftp, mailto, tel, plus protocol-relative,
 * fragment, and relative URLs. Mirrors sanitize-html's prior allowedSchemes.
 */
const ALLOWED_URI_REGEXP = /^(?:(?:https?|ftp|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

const sanitize = (html: string): string =>
  DOMPurify.sanitize(html, {
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    ALLOW_DATA_ATTR: false,
  });

export { sanitize };
