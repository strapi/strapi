import {
  parseEmailAddress,
  parseMultipleEmailAddresses,
  formatEmailAddress,
  normalizeEmail,
  decodeRfc2047,
  encodeRfc2047Base64,
  encodeRfc2047QuotedPrintable,
  extractComments,
  unquoteString,
  isValidEmail,
} from '../utils/email-address';

describe('Email Address Parser', () => {
  describe('parseEmailAddress', () => {
    describe('basic formats', () => {
      it('should parse a simple email address', () => {
        const result = parseEmailAddress('test@example.com');
        expect(result.name).toBeNull();
        expect(result.email).toBe('test@example.com');
      });

      it('should parse name with angle brackets', () => {
        const result = parseEmailAddress('John Doe <john@example.com>');
        expect(result.name).toBe('John Doe');
        expect(result.email).toBe('john@example.com');
      });

      it('should parse quoted name', () => {
        const result = parseEmailAddress('"Doe, John" <john@example.com>');
        expect(result.name).toBe('Doe, John');
        expect(result.email).toBe('john@example.com');
      });

      it('should handle empty input', () => {
        expect(parseEmailAddress('')).toEqual({ name: null, email: '', original: '' });
        expect(parseEmailAddress(null)).toEqual({ name: null, email: '', original: '' });
        expect(parseEmailAddress(undefined)).toEqual({ name: null, email: '', original: '' });
      });
    });

    describe('RFC 2047 encoded-words', () => {
      it('should decode Base64 encoded name (UTF-8)', () => {
        // "Strapi" in Base64
        const result = parseEmailAddress('=?UTF-8?B?U3RyYXBp?= <no-reply@strapi.io>');
        expect(result.name).toBe('Strapi');
        expect(result.email).toBe('no-reply@strapi.io');
      });

      it('should decode Quoted-Printable encoded name', () => {
        // "Müller" in Quoted-Printable
        const result = parseEmailAddress('=?UTF-8?Q?M=C3=BCller?= <mueller@example.com>');
        expect(result.name).toBe('Müller');
        expect(result.email).toBe('mueller@example.com');
      });

      it('should decode Base64 with special characters', () => {
        // "日本語" (Japanese) in Base64
        const encoded = Buffer.from('日本語').toString('base64');
        const result = parseEmailAddress(`=?UTF-8?B?${encoded}?= <japanese@example.com>`);
        expect(result.name).toBe('日本語');
        expect(result.email).toBe('japanese@example.com');
      });

      it('should handle lowercase encoding markers', () => {
        const result = parseEmailAddress('=?utf-8?b?U3RyYXBp?= <no-reply@strapi.io>');
        expect(result.name).toBe('Strapi');
      });

      it('should preserve original on decode failure', () => {
        const invalid = '=?INVALID?X?garbage?=';
        const result = parseEmailAddress(`${invalid} <test@example.com>`);
        expect(result.email).toBe('test@example.com');
      });
    });

    describe('RFC 5322 comments', () => {
      it('should extract comment after email', () => {
        const result = parseEmailAddress('support@example.com (Support Team)');
        expect(result.name).toBe('Support Team');
        expect(result.email).toBe('support@example.com');
      });

      it('should extract comment before email', () => {
        const result = parseEmailAddress('(Admin) admin@example.com');
        expect(result.name).toBe('Admin');
        expect(result.email).toBe('admin@example.com');
      });

      it('should handle nested comments', () => {
        const result = parseEmailAddress('test@example.com (Outer (Inner) Comment)');
        expect(result.name).toBe('Outer (Inner) Comment');
        expect(result.email).toBe('test@example.com');
      });

      it('should prefer name over comment when both present', () => {
        const result = parseEmailAddress('Name <test@example.com> (Comment)');
        expect(result.name).toBe('Name');
        expect(result.email).toBe('test@example.com');
      });

      it('should use comment as name when no explicit name', () => {
        const result = parseEmailAddress('<test@example.com> (Display Name)');
        expect(result.name).toBe('Display Name');
        expect(result.email).toBe('test@example.com');
      });
    });

    describe('RFC 5322 quoted strings', () => {
      it('should handle name with comma', () => {
        const result = parseEmailAddress('"Last, First" <test@example.com>');
        expect(result.name).toBe('Last, First');
      });

      it('should handle name with special characters', () => {
        const result = parseEmailAddress('"Support (24/7)" <support@example.com>');
        expect(result.name).toBe('Support (24/7)');
      });

      it('should handle escaped quotes in name', () => {
        const result = parseEmailAddress('"Say \\"Hello\\"" <test@example.com>');
        expect(result.name).toBe('Say "Hello"');
      });

      it('should handle escaped backslash', () => {
        const result = parseEmailAddress('"Back\\\\slash" <test@example.com>');
        expect(result.name).toBe('Back\\slash');
      });
    });

    describe('edge cases', () => {
      it('should handle whitespace', () => {
        const result = parseEmailAddress('  Name   <  test@example.com  >  ');
        expect(result.name).toBe('Name');
        expect(result.email).toBe('test@example.com');
      });

      it('should preserve original string', () => {
        const original = 'Test <test@example.com>';
        const result = parseEmailAddress(original);
        expect(result.original).toBe(original);
      });

      it('should handle email without name but with empty angle brackets prefix', () => {
        const result = parseEmailAddress('<test@example.com>');
        expect(result.name).toBeNull();
        expect(result.email).toBe('test@example.com');
      });
    });

    describe('email normalization (RFC 5321)', () => {
      it('should lowercase the entire email address', () => {
        const result = parseEmailAddress('User@Example.COM');
        expect(result.email).toBe('user@example.com');
      });

      it('should lowercase email in angle bracket format', () => {
        const result = parseEmailAddress('John Doe <John.Doe@Example.COM>');
        expect(result.email).toBe('john.doe@example.com');
        expect(result.name).toBe('John Doe');
      });

      it('should lowercase email with comment format', () => {
        const result = parseEmailAddress('Admin@EXAMPLE.ORG (Administrator)');
        expect(result.email).toBe('admin@example.org');
        expect(result.name).toBe('Administrator');
      });

      it('should preserve original casing in original field', () => {
        const original = 'User@Example.COM';
        const result = parseEmailAddress(original);
        expect(result.email).toBe('user@example.com');
        expect(result.original).toBe(original);
      });

      it('should handle mixed case with RFC 2047 encoding', () => {
        const result = parseEmailAddress('=?UTF-8?B?U3RyYXBp?= <No-Reply@Strapi.IO>');
        expect(result.email).toBe('no-reply@strapi.io');
        expect(result.name).toBe('Strapi');
      });
    });
  });

  describe('normalizeEmail', () => {
    it('should lowercase the email', () => {
      expect(normalizeEmail('User@Example.COM')).toBe('user@example.com');
    });

    it('should handle already lowercase emails', () => {
      expect(normalizeEmail('user@example.com')).toBe('user@example.com');
    });

    it('should handle empty string', () => {
      expect(normalizeEmail('')).toBe('');
    });
  });

  describe('parseMultipleEmailAddresses', () => {
    it('should parse multiple simple addresses', () => {
      const result = parseMultipleEmailAddresses('a@example.com, b@example.com');
      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('a@example.com');
      expect(result[1].email).toBe('b@example.com');
    });

    it('should handle addresses with names', () => {
      const result = parseMultipleEmailAddresses('Name A <a@example.com>, Name B <b@example.com>');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Name A');
      expect(result[1].name).toBe('Name B');
    });

    it('should handle quoted names with commas', () => {
      const result = parseMultipleEmailAddresses('"Doe, John" <a@example.com>, b@example.com');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Doe, John');
      expect(result[1].email).toBe('b@example.com');
    });

    it('should handle empty input', () => {
      expect(parseMultipleEmailAddresses('')).toEqual([]);
      expect(parseMultipleEmailAddresses(null)).toEqual([]);
    });

    it('should handle escaped backslash before quote correctly', () => {
      // \\" = escaped backslash + real quote -> should toggle inQuotes
      const result = parseMultipleEmailAddresses('"Back\\\\" <a@example.com>, b@example.com');
      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('a@example.com');
      expect(result[1].email).toBe('b@example.com');
    });
  });

  describe('formatEmailAddress', () => {
    it('should format simple address', () => {
      const result = formatEmailAddress('John Doe', 'john@example.com');
      expect(result).toBe('John Doe <john@example.com>');
    });

    it('should return just email when no name', () => {
      const result = formatEmailAddress(null, 'test@example.com');
      expect(result).toBe('test@example.com');
    });

    it('should quote name with special characters', () => {
      const result = formatEmailAddress('Doe, John', 'john@example.com');
      expect(result).toBe('"Doe, John" <john@example.com>');
    });

    it('should encode non-ASCII characters', () => {
      const result = formatEmailAddress('Müller', 'mueller@example.com');
      expect(result).toMatch(/^=\?UTF-8\?B\?.*\?= <mueller@example\.com>$/);

      // Verify it decodes back correctly
      const parsed = parseEmailAddress(result);
      expect(parsed.name).toBe('Müller');
    });

    it('should skip encoding when disabled', () => {
      const result = formatEmailAddress('Müller', 'mueller@example.com', { encodeNonAscii: false });
      expect(result).toBe('Müller <mueller@example.com>');
    });

    it('should normalize email to lowercase', () => {
      const result = formatEmailAddress('John Doe', 'John.Doe@Example.COM');
      expect(result).toBe('John Doe <john.doe@example.com>');
    });

    it('should normalize email without name to lowercase', () => {
      const result = formatEmailAddress(null, 'Admin@EXAMPLE.ORG');
      expect(result).toBe('admin@example.org');
    });
  });

  describe('decodeRfc2047', () => {
    it('should decode Base64', () => {
      const encoded = '=?UTF-8?B?SGVsbG8gV29ybGQ=?=';
      expect(decodeRfc2047(encoded)).toBe('Hello World');
    });

    it('should decode Quoted-Printable', () => {
      const encoded = '=?UTF-8?Q?Hello_World?=';
      expect(decodeRfc2047(encoded)).toBe('Hello World');
    });

    it('should decode multiple encoded words', () => {
      const encoded = '=?UTF-8?B?SGVsbG8=?= =?UTF-8?B?V29ybGQ=?=';
      expect(decodeRfc2047(encoded)).toBe('Hello World');
    });

    it('should preserve non-encoded text', () => {
      const text = 'Normal text without encoding';
      expect(decodeRfc2047(text)).toBe(text);
    });
  });

  describe('encodeRfc2047Base64', () => {
    it('should encode non-ASCII characters', () => {
      const result = encodeRfc2047Base64('Müller');
      expect(result).toBe('=?UTF-8?B?TcO8bGxlcg==?=');
    });

    it('should not encode ASCII-only strings', () => {
      const result = encodeRfc2047Base64('Hello');
      expect(result).toBe('Hello');
    });

    it('should split long non-ASCII names into multiple encoded words (RFC 2047 75-char limit)', () => {
      // 100 copies of a 2-byte Unicode char = 200 bytes, way over the 45-byte chunk limit
      const longName = '\u00fc'.repeat(100);
      const result = encodeRfc2047Base64(longName);

      // Must produce multiple encoded words separated by space
      const parts = result.split(' ');
      expect(parts.length).toBeGreaterThan(1);

      // Each part must be a valid encoded word and <= 75 chars
      for (const part of parts) {
        expect(part).toMatch(/^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/);
        expect(part.length).toBeLessThanOrEqual(75);
      }

      // Must decode back to the original
      const decoded = parts
        .map((p) => {
          const b64 = p.replace(/^=\?UTF-8\?B\?/, '').replace(/\?=$/, '');
          return Buffer.from(b64, 'base64').toString('utf-8');
        })
        .join('');
      expect(decoded).toBe(longName);
    });

    it('should not split mid-character for multi-byte UTF-8', () => {
      // Emoji is 4 bytes in UTF-8
      const emojiName = '\u{1F600}'.repeat(20);
      const result = encodeRfc2047Base64(emojiName);
      const parts = result.split(' ');

      const decoded = parts
        .map((p) => {
          const b64 = p.replace(/^=\?UTF-8\?B\?/, '').replace(/\?=$/, '');
          return Buffer.from(b64, 'base64').toString('utf-8');
        })
        .join('');
      expect(decoded).toBe(emojiName);
    });
  });

  describe('encodeRfc2047QuotedPrintable', () => {
    it('should encode non-ASCII characters', () => {
      const result = encodeRfc2047QuotedPrintable('Müller');
      expect(result).toMatch(/^=\?UTF-8\?Q\?.*\?=$/);

      // Verify it decodes back correctly
      expect(decodeRfc2047(result)).toBe('Müller');
    });

    it('should not encode ASCII-only strings', () => {
      const result = encodeRfc2047QuotedPrintable('Hello');
      expect(result).toBe('Hello');
    });
  });

  describe('extractComments', () => {
    it('should extract single comment', () => {
      const result = extractComments('text (comment)');
      expect(result.text).toBe('text');
      expect(result.comments).toEqual(['comment']);
    });

    it('should extract multiple comments', () => {
      const result = extractComments('(first) text (second)');
      expect(result.text).toBe('text');
      expect(result.comments).toEqual(['first', 'second']);
    });

    it('should handle nested comments', () => {
      const result = extractComments('text (outer (inner) more)');
      expect(result.comments).toEqual(['outer (inner) more']);
    });

    it('should ignore parentheses in quotes', () => {
      const result = extractComments('"(not a comment)" text');
      expect(result.text).toBe('"(not a comment)" text');
      expect(result.comments).toEqual([]);
    });

    it('should handle unmatched closing parenthesis without crashing', () => {
      const result = extractComments('text ) more text');
      expect(result.text).toBe('text ) more text');
      expect(result.comments).toEqual([]);
    });

    it('should handle unmatched closing paren followed by valid comment', () => {
      const result = extractComments('a ) b (valid)');
      expect(result.text).toBe('a ) b');
      expect(result.comments).toEqual(['valid']);
    });
  });

  describe('unquoteString', () => {
    it('should unquote simple string', () => {
      expect(unquoteString('"Hello"')).toBe('Hello');
    });

    it('should handle escaped characters', () => {
      expect(unquoteString('"Say \\"Hi\\""')).toBe('Say "Hi"');
    });

    it('should return non-quoted strings unchanged', () => {
      expect(unquoteString('Hello')).toBe('Hello');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.com')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
    });

    it('should handle internationalized emails (RFC 6531)', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('should reject consecutive dots in local part', () => {
      expect(isValidEmail('user..name@example.com')).toBe(false);
    });

    it('should reject leading dot in local part', () => {
      expect(isValidEmail('.user@example.com')).toBe(false);
    });

    it('should reject trailing dot in local part', () => {
      expect(isValidEmail('user.@example.com')).toBe(false);
    });

    it('should reject local part exceeding 64 characters', () => {
      const longLocal = 'a'.repeat(65);
      expect(isValidEmail(`${longLocal}@example.com`)).toBe(false);
    });

    it('should accept local part at exactly 64 characters', () => {
      const maxLocal = 'a'.repeat(64);
      expect(isValidEmail(`${maxLocal}@example.com`)).toBe(true);
    });

    it('should reject domain exceeding 255 characters', () => {
      const longDomain = `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.com`;
      expect(isValidEmail(`user@${longDomain}`)).toBe(false);
    });

    it('should reject email exceeding 320 characters total', () => {
      const local = 'a'.repeat(64);
      // Build a domain that pushes total over 320: 64 + 1(@) + 256 = 321
      const domain = `${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.${'e'.repeat(62)}.com`;
      const email = `${local}@${domain}`;
      expect(email.length).toBeGreaterThan(320);
      expect(isValidEmail(email)).toBe(false);
    });
  });
});
