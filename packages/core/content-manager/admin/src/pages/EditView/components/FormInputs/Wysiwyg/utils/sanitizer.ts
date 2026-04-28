import DOMPurify from 'dompurify';

/**
 * Attribute allowlist mirrors the prior sanitize-html configuration:
 *   '*':    href, align, alt, center, width, height, type, controls, target
 *   img:    src, alt
 *   source: src, type
 *
 * DOMPurify's ALLOWED_ATTR is a flat list (no per-tag scoping), so the union
 * of the original allowlist is used. Tags that the prior config never reached
 * (script, iframe, etc.) are stripped wholesale by DOMPurify's default tag
 * allowlist, so per-tag attribute scoping is not security-relevant here.
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
