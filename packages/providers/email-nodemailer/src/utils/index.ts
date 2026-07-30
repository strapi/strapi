/**
 * Email Address Utilities
 *
 * RFC-compliant utilities for parsing and formatting email addresses.
 *
 * @example
 * import { parseEmailAddress, formatEmailAddress } from '@strapi/provider-email-nodemailer/utils';
 *
 * const parsed = parseEmailAddress('Strapi <no-reply@strapi.io>');
 * console.log(parsed.name);  // 'Strapi'
 * console.log(parsed.email); // 'no-reply@strapi.io'
 *
 * const formatted = formatEmailAddress('Müller', 'mueller@example.com');
 * console.log(formatted); // '=?UTF-8?B?TcO8bGxlcg==?= <mueller@example.com>'
 */
export {
  // Types
  type ParsedEmailAddress,
  // Parsing
  parseEmailAddress,
  parseMultipleEmailAddresses,
  // Formatting
  formatEmailAddress,
  // Normalization (RFC 5321)
  normalizeEmail,
  // RFC 2047 Encoding/Decoding
  decodeRfc2047,
  encodeRfc2047Base64,
  encodeRfc2047QuotedPrintable,
  // RFC 5322 Utilities
  extractComments,
  unquoteString,
  // Validation
  isValidEmail,
} from './email-address';
