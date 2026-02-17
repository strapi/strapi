/**
 * RFC-compliant Email Address Utilities for Nodemailer Provider
 *
 * Provides utilities for parsing and formatting email addresses
 * according to RFC 5322, RFC 2047, and related standards.
 *
 * @module @strapi/provider-email-nodemailer/utils
 */

export interface ParsedEmailAddress {
  /** Display name (decoded if RFC 2047 encoded) */
  name: string | null;
  /** Email address (normalized to lowercase per RFC 5321) */
  email: string;
  /** Original unparsed string */
  original: string;
}

/**
 * Normalizes an email address to lowercase.
 *
 * Per RFC 5321 section 2.4, the domain part of an email address is
 * case-insensitive. While the local part is technically case-sensitive,
 * in practice virtually all mail systems treat it as case-insensitive.
 * Major providers (Gmail, Outlook, Yahoo, etc.) all normalize to lowercase.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc5321#section-2.4
 */
export const normalizeEmail = (email: string): string => {
  if (!email) return email;
  return email.toLowerCase();
};

/**
 * Decodes RFC 2047 encoded-words
 * Supports both Base64 (B) and Quoted-Printable (Q) encodings
 *
 * @example
 * decodeRfc2047('=?UTF-8?B?U3RyYXBp?=')
 * // 'Strapi'
 *
 * @example
 * decodeRfc2047('=?UTF-8?Q?M=C3=BCller?=')
 * // 'Müller'
 *
 * @see https://datatracker.ietf.org/doc/html/rfc2047
 */
export const decodeRfc2047 = (encoded: string): string => {
  const rfc2047Pattern = /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g;

  return encoded.replace(rfc2047Pattern, (match, charset, encoding, text) => {
    try {
      const upperEncoding = encoding.toUpperCase();

      if (upperEncoding === 'B') {
        return Buffer.from(text, 'base64').toString('utf-8');
      }

      if (upperEncoding === 'Q') {
        const withSpaces = text.replace(/_/g, ' ');
        const decoded = withSpaces.replace(/=([0-9A-Fa-f]{2})/g, (_: string, hex: string) =>
          String.fromCharCode(parseInt(hex, 16))
        );
        const bytes = Buffer.from(decoded, 'binary');
        return bytes.toString('utf-8');
      }

      return match;
    } catch {
      return match;
    }
  });
};

/**
 * Encodes a string as RFC 2047 Base64 encoded-word
 * Use this when the display name contains non-ASCII characters
 *
 * @example
 * encodeRfc2047Base64('Müller')
 * // '=?UTF-8?B?TcO8bGxlcg==?='
 *
 * @see https://datatracker.ietf.org/doc/html/rfc2047
 */
export const encodeRfc2047Base64 = (str: string): string => {
  // Check if encoding is needed (non-ASCII characters)
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(str)) {
    return str;
  }

  const encoded = Buffer.from(str, 'utf-8').toString('base64');
  return `=?UTF-8?B?${encoded}?=`;
};

/**
 * Encodes a string as RFC 2047 Quoted-Printable encoded-word
 *
 * @example
 * encodeRfc2047QuotedPrintable('Müller')
 * // '=?UTF-8?Q?M=C3=BCller?='
 */
export const encodeRfc2047QuotedPrintable = (str: string): string => {
  // Check if encoding is needed
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(str)) {
    return str;
  }

  const bytes = Buffer.from(str, 'utf-8');
  let result = '';

  for (const byte of bytes) {
    // Printable ASCII (except = ? _ and space)
    if ((byte >= 33 && byte <= 126 && byte !== 61 && byte !== 63 && byte !== 95) || byte === 32) {
      result += byte === 32 ? '_' : String.fromCharCode(byte);
    } else {
      result += `=${byte.toString(16).toUpperCase().padStart(2, '0')}`;
    }
  }

  return `=?UTF-8?Q?${result}?=`;
};

/**
 * Extracts RFC 5322 comments from an email string
 * Comments are enclosed in parentheses
 *
 * @example
 * extractComments('email@example.com (Support Team)')
 * // { text: 'email@example.com', comments: ['Support Team'] }
 */
export const extractComments = (str: string): { text: string; comments: string[] } => {
  const comments: string[] = [];
  let result = '';
  let depth = 0;
  let currentComment = '';
  let inQuotes = false;
  let escape = false;

  for (const char of str) {
    if (escape) {
      if (depth > 0) {
        currentComment += char;
      } else {
        result += char;
      }
      escape = false;
    } else if (char === '\\') {
      escape = true;
      if (depth > 0) {
        currentComment += char;
      } else {
        result += char;
      }
    } else if (char === '"' && depth === 0) {
      inQuotes = !inQuotes;
      result += char;
    } else if (!inQuotes && char === '(') {
      if (depth === 0) {
        currentComment = '';
      } else {
        currentComment += char;
      }
      depth += 1;
    } else if (!inQuotes && char === ')') {
      depth -= 1;
      if (depth === 0) {
        comments.push(currentComment.trim());
        currentComment = '';
      } else if (depth > 0) {
        currentComment += char;
      }
    } else if (depth > 0) {
      currentComment += char;
    } else {
      result += char;
    }
  }

  return { text: result.trim(), comments };
};

/**
 * Unquotes a RFC 5322 quoted string
 *
 * @example
 * unquoteString('"Doe, John"')
 * // 'Doe, John'
 */
export const unquoteString = (str: string): string => {
  const trimmed = str.trim();

  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) {
    return trimmed;
  }

  const inner = trimmed.slice(1, -1);
  let result = '';
  let escape = false;

  for (const char of inner) {
    if (escape) {
      result += char;
      escape = false;
    } else if (char === '\\') {
      escape = true;
    } else {
      result += char;
    }
  }

  return result;
};

/**
 * Parses an email address string according to RFC 5322
 *
 * Supported formats:
 * - Simple: "email@example.com"
 * - With name: "Name <email@example.com>"
 * - Quoted name: "\"Doe, John\" <email@example.com>"
 * - RFC 2047 encoded: "=?UTF-8?B?...?= <email@example.com>"
 * - With comment: "email@example.com (Display Name)"
 *
 * @example
 * parseEmailAddress('Strapi <no-reply@strapi.io>')
 * // { name: 'Strapi', email: 'no-reply@strapi.io', original: '...' }
 *
 * @example
 * parseEmailAddress('=?UTF-8?B?U3RyYXBp?= <no-reply@strapi.io>')
 * // { name: 'Strapi', email: 'no-reply@strapi.io', original: '...' }
 */
export const parseEmailAddress = (emailString: string | undefined | null): ParsedEmailAddress => {
  if (!emailString || typeof emailString !== 'string') {
    return { name: null, email: '', original: emailString || '' };
  }

  const original = emailString;

  // Step 1: Decode RFC 2047 encoded-words
  let decoded = decodeRfc2047(emailString);

  // Step 2: Extract comments
  const { text: withoutComments, comments } = extractComments(decoded);
  decoded = withoutComments;

  // Step 3: Parse "Name <email>" format
  const angleMatch = decoded.match(/^(.*?)\s*<([^>]+)>\s*$/);

  if (angleMatch) {
    let name = angleMatch[1].trim();
    const email = normalizeEmail(angleMatch[2].trim());

    if (name) {
      name = unquoteString(name);
      name = decodeRfc2047(name);
    }

    if (!name && comments.length > 0) {
      name = comments[0];
    }

    return {
      name: name || null,
      email,
      original,
    };
  }

  // Step 4: Handle "email (comment)" format
  const trimmedDecoded = decoded.trim();

  if (trimmedDecoded.includes('@')) {
    return {
      name: comments.length > 0 ? comments[0] : null,
      email: normalizeEmail(trimmedDecoded),
      original,
    };
  }

  return {
    name: null,
    email: trimmedDecoded,
    original,
  };
};

/**
 * Formats an email address according to RFC 5322
 *
 * Automatically quotes names containing special characters
 * and encodes non-ASCII characters using RFC 2047.
 *
 * @example
 * formatEmailAddress('Strapi', 'no-reply@strapi.io')
 * // 'Strapi <no-reply@strapi.io>'
 *
 * @example
 * formatEmailAddress('Doe, John', 'john@example.com')
 * // '"Doe, John" <john@example.com>'
 *
 * @example
 * formatEmailAddress('Müller', 'mueller@example.com')
 * // '=?UTF-8?B?TcO8bGxlcg==?= <mueller@example.com>'
 */
export const formatEmailAddress = (
  name: string | null,
  email: string,
  options: { encodeNonAscii?: boolean } = {}
): string => {
  const { encodeNonAscii = true } = options;
  const normalizedEmail = normalizeEmail(email);

  if (!name) {
    return normalizedEmail;
  }

  let formattedName = name;

  // Check for non-ASCII characters and encode if needed
  // eslint-disable-next-line no-control-regex
  if (encodeNonAscii && /[^\x00-\x7F]/.test(name)) {
    formattedName = encodeRfc2047Base64(name);
    return `${formattedName} <${normalizedEmail}>`;
  }

  // Check if name needs quoting (special characters)
  const needsQuoting = /[()<>@,;:\\".[\]]/.test(formattedName);

  if (needsQuoting && !formattedName.startsWith('"')) {
    const escaped = formattedName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escaped}" <${normalizedEmail}>`;
  }

  return `${formattedName} <${normalizedEmail}>`;
};

/**
 * Validates an email address according to RFC 5322
 *
 * @example
 * isValidEmail('user@example.com')
 * // true
 *
 * @example
 * isValidEmail('invalid')
 * // false
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailPattern =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~\u0080-\uFFFF-]+@[a-zA-Z0-9\u0080-\uFFFF](?:[a-zA-Z0-9\u0080-\uFFFF-]{0,61}[a-zA-Z0-9\u0080-\uFFFF])?(?:\.[a-zA-Z0-9\u0080-\uFFFF](?:[a-zA-Z0-9\u0080-\uFFFF-]{0,61}[a-zA-Z0-9\u0080-\uFFFF])?)*$/;

  return emailPattern.test(email);
};

/**
 * Parses multiple comma-separated email addresses
 *
 * @example
 * parseMultipleEmailAddresses('a@example.com, "Doe, John" <b@example.com>')
 * // [{ name: null, email: 'a@example.com' }, { name: 'Doe, John', email: 'b@example.com' }]
 */
export const parseMultipleEmailAddresses = (
  emailsString: string | undefined | null
): ParsedEmailAddress[] => {
  if (!emailsString || typeof emailsString !== 'string') {
    return [];
  }

  const addresses: string[] = [];
  let current = '';
  let inQuotes = false;
  let depth = 0;
  let prevChar = '';

  for (const char of emailsString) {
    // Handle escape sequences
    if (prevChar === '\\') {
      current += char;
      prevChar = char;
    } else if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      prevChar = char;
    } else if (!inQuotes && (char === '<' || char === '(')) {
      depth += 1;
      current += char;
      prevChar = char;
    } else if (!inQuotes && (char === '>' || char === ')')) {
      depth -= 1;
      current += char;
      prevChar = char;
    } else if (!inQuotes && char === ',' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) {
        addresses.push(trimmed);
      }
      current = '';
      prevChar = char;
    } else {
      current += char;
      prevChar = char;
    }
  }

  const trimmed = current.trim();
  if (trimmed) {
    addresses.push(trimmed);
  }

  return addresses.map(parseEmailAddress);
};
