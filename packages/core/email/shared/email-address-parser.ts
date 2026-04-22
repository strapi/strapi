/**
 * RFC-compliant Email Address Parser
 *
 * Supports:
 * - RFC 5322: Internet Message Format (basic name <email> format)
 * - RFC 2047: MIME encoded-words for non-ASCII characters
 * - RFC 5322: Comments in parentheses
 * - RFC 5322: Quoted strings with special characters
 * - RFC 6531: Internationalized email addresses (UTF-8)
 */

export interface ParsedEmailAddress {
  /** Display name (decoded if RFC 2047 encoded) */
  name: string | null;
  /** Email address */
  email: string;
  /** Original unparsed string */
  original: string;
}

/**
 * Decodes RFC 2047 encoded-words
 * Supports both Base64 (B) and Quoted-Printable (Q) encodings
 *
 * Examples:
 * - =?UTF-8?B?U3RyYXBp?= -> "Strapi"
 * - =?UTF-8?Q?M=C3=BCller?= -> "Müller"
 * - =?ISO-8859-1?Q?=E4=F6=FC?= -> "äöü"
 *
 * @see https://datatracker.ietf.org/doc/html/rfc2047
 */
const decodeRfc2047 = (encoded: string): string => {
  // Pattern: =?charset?encoding?encoded_text?=
  const rfc2047Pattern = /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g;

  return encoded.replace(rfc2047Pattern, (match, charset, encoding, text) => {
    try {
      const upperEncoding = encoding.toUpperCase();

      if (upperEncoding === 'B') {
        // Base64 decoding
        const decoded = atob(text);
        return decodeWithCharset(decoded, charset);
      }

      if (upperEncoding === 'Q') {
        // Quoted-Printable decoding
        // In Q encoding, underscores represent spaces
        const withSpaces = text.replace(/_/g, ' ');
        // Decode =XX hex sequences
        const decoded = withSpaces.replace(/=([0-9A-Fa-f]{2})/g, (_: string, hex: string) =>
          String.fromCharCode(parseInt(hex, 16))
        );
        return decodeWithCharset(decoded, charset);
      }

      return match;
    } catch {
      // If decoding fails, return original
      return match;
    }
  });
};

/**
 * Decode a string with a specific charset
 * Falls back to the original string if decoding fails
 */
const decodeWithCharset = (str: string, charset: string): string => {
  try {
    // For UTF-8, we need to handle the bytes properly
    const upperCharset = charset.toUpperCase();
    if (upperCharset === 'UTF-8' || upperCharset === 'UTF8') {
      // Convert byte string to UTF-8
      const bytes = new Uint8Array(str.split('').map((c) => c.charCodeAt(0)));
      return new TextDecoder('utf-8').decode(bytes);
    }
    // For ISO-8859-1 (Latin-1), characters map directly
    if (upperCharset === 'ISO-8859-1' || upperCharset === 'LATIN1' || upperCharset === 'LATIN-1') {
      return str;
    }
    // For other charsets, try TextDecoder
    const bytes = new Uint8Array(str.split('').map((c) => c.charCodeAt(0)));
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return str;
  }
};

/**
 * Removes RFC 5322 comments from an email string
 * Comments are enclosed in parentheses and can be nested
 *
 * Examples:
 * - "email@example.com (Support Team)" -> "email@example.com"
 * - "(comment) Name <email@example.com>" -> "Name <email@example.com>"
 *
 * @see https://datatracker.ietf.org/doc/html/rfc5322#section-3.2.2
 */
const extractComments = (str: string): { text: string; comments: string[] } => {
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
 * Unquotes a quoted string according to RFC 5322
 * Handles escaped characters within quoted strings
 *
 * Examples:
 * - "\"John Doe\"" -> "John Doe"
 * - "\"Doe, John\"" -> "Doe, John"
 * - "\"Support \\\"24/7\\\"\"" -> "Support \"24/7\""
 *
 * @see https://datatracker.ietf.org/doc/html/rfc5322#section-3.2.4
 */
const unquoteString = (str: string): string => {
  const trimmed = str.trim();

  // Check if it's a quoted string
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) {
    return trimmed;
  }

  // Remove surrounding quotes
  const inner = trimmed.slice(1, -1);

  // Unescape escaped characters (\" -> ", \\ -> \)
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
 * Parses an email address string according to RFC 5322 and related RFCs
 *
 * Supported formats:
 * 1. Simple email: "email@example.com"
 * 2. Name with angle brackets: "Name <email@example.com>"
 * 3. Quoted name: "\"Doe, John\" <email@example.com>"
 * 4. RFC 2047 encoded: "=?UTF-8?B?...?= <email@example.com>"
 * 5. With comment: "email@example.com (Display Name)"
 * 6. Mixed: "\"Name\" <email@example.com> (comment)"
 *
 * @param emailString - The email address string to parse
 * @returns Parsed email address with name, email, and original string
 *
 * @example
 * parseEmailAddress('Strapi <no-reply@strapi.io>')
 * // { name: 'Strapi', email: 'no-reply@strapi.io', original: '...' }
 *
 * @example
 * parseEmailAddress('=?UTF-8?B?U3RyYXBp?= <no-reply@strapi.io>')
 * // { name: 'Strapi', email: 'no-reply@strapi.io', original: '...' }
 *
 * @example
 * parseEmailAddress('no-reply@strapi.io (Strapi Support)')
 * // { name: 'Strapi Support', email: 'no-reply@strapi.io', original: '...' }
 */
export const parseEmailAddress = (emailString: string | undefined | null): ParsedEmailAddress => {
  if (!emailString || typeof emailString !== 'string') {
    return { name: null, email: '', original: emailString || '' };
  }

  const original = emailString;

  // Step 1: Decode any RFC 2047 encoded-words
  let decoded = decodeRfc2047(emailString);

  // Step 2: Extract and remove comments, but save them
  const { text: withoutComments, comments } = extractComments(decoded);
  decoded = withoutComments;

  // Step 3: Try to parse "Name <email>" format
  // This regex handles both quoted and unquoted names
  const angleMatch = decoded.match(/^(.*?)\s*<([^>]+)>\s*$/);

  if (angleMatch) {
    let name = angleMatch[1].trim();
    const email = angleMatch[2].trim();

    // Unquote the name if it's quoted
    if (name) {
      name = unquoteString(name);
      // Decode again in case the name itself contains encoded words
      name = decodeRfc2047(name);
    }

    // If no name in the main part, check comments
    if (!name && comments.length > 0) {
      name = comments[0];
    }

    return {
      name: name || null,
      email,
      original,
    };
  }

  // Step 4: Try "email (comment)" format - use comment as name
  // At this point, comments are already extracted
  const trimmedDecoded = decoded.trim();

  // Validate it looks like an email (basic check)
  if (trimmedDecoded.includes('@')) {
    return {
      name: comments.length > 0 ? comments[0] : null,
      email: trimmedDecoded,
      original,
    };
  }

  // Step 5: If nothing matched, treat the whole thing as email
  return {
    name: null,
    email: trimmedDecoded,
    original,
  };
};

/**
 * Formats an email address according to RFC 5322
 *
 * @param name - Display name (will be quoted if contains special chars)
 * @param email - Email address
 * @returns Formatted email address string
 *
 * @example
 * formatEmailAddress('Strapi', 'no-reply@strapi.io')
 * // 'Strapi <no-reply@strapi.io>'
 *
 * @example
 * formatEmailAddress('Doe, John', 'john@example.com')
 * // '"Doe, John" <john@example.com>'
 */
export const formatEmailAddress = (name: string | null, email: string): string => {
  if (!name) {
    return email;
  }

  // Check if name needs quoting (contains special characters)
  // RFC 5322 specials: ()<>@,;:\".[]
  const needsQuoting = /[()<>@,;:\\".[\]]/.test(name) || name.includes(' ');

  if (needsQuoting && !name.startsWith('"')) {
    // Escape any existing quotes and backslashes
    const escaped = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escaped}" <${email}>`;
  }

  return `${name} <${email}>`;
};

/**
 * Validates an email address according to RFC 5322
 * This is a simplified validation that covers most common cases
 *
 * @param email - Email address to validate
 * @returns true if the email appears valid
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic RFC 5322 pattern (simplified)
  // Allows internationalized domains (RFC 6531)
  const emailPattern =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~\u0080-\uFFFF-]+@[a-zA-Z0-9\u0080-\uFFFF](?:[a-zA-Z0-9\u0080-\uFFFF-]{0,61}[a-zA-Z0-9\u0080-\uFFFF])?(?:\.[a-zA-Z0-9\u0080-\uFFFF](?:[a-zA-Z0-9\u0080-\uFFFF-]{0,61}[a-zA-Z0-9\u0080-\uFFFF])?)*$/;

  return emailPattern.test(email);
};

/**
 * Parses multiple email addresses separated by commas
 * Handles quoted strings that may contain commas
 *
 * @param emailsString - Comma-separated email addresses
 * @returns Array of parsed email addresses
 *
 * @example
 * parseMultipleEmailAddresses('a@example.com, "Doe, John" <b@example.com>')
 * // [{ name: null, email: 'a@example.com', ... }, { name: 'Doe, John', email: 'b@example.com', ... }]
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

  // Don't forget the last address
  const trimmed = current.trim();
  if (trimmed) {
    addresses.push(trimmed);
  }

  return addresses.map(parseEmailAddress);
};
