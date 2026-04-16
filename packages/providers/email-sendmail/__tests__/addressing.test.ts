import {
  collectRecipients,
  extractEmail,
  getHostFromAddress,
  groupRecipientsByDomain,
  parseAddressList,
} from '../src/addressing';

describe('addressing', () => {
  describe('extractEmail', () => {
    it('extracts from angle bracket form', () => {
      expect(extractEmail('Name <user@example.com>')).toBe('user@example.com');
    });

    it('returns bare address', () => {
      expect(extractEmail('user@example.com')).toBe('user@example.com');
    });

    it('trims whitespace', () => {
      expect(extractEmail('  user@example.com  ')).toBe('user@example.com');
    });
  });

  describe('parseAddressList', () => {
    it('splits comma-separated addresses', () => {
      expect(parseAddressList('a@x.com, b@y.com')).toEqual(['a@x.com', 'b@y.com']);
    });

    it('returns empty array for undefined', () => {
      expect(parseAddressList(undefined)).toEqual([]);
    });

    it('handles display names', () => {
      expect(parseAddressList('A <a@x.com>, B <b@y.com>')).toEqual(['a@x.com', 'b@y.com']);
    });

    it('accepts array input (legacy sendmail behavior)', () => {
      expect(parseAddressList(['A <a@x.com>', 'b@y.com'])).toEqual(['a@x.com', 'b@y.com']);
    });
  });

  describe('getHostFromAddress', () => {
    it('returns domain after @', () => {
      expect(getHostFromAddress('user@mail.example.org')).toBe('mail.example.org');
    });

    it('uses legacy first-match host extraction on multiple @', () => {
      expect(getHostFromAddress('odd@local@mail.example.org')).toBe('local');
    });

    it('returns undefined when there is no @', () => {
      expect(getHostFromAddress('not-an-email')).toBeUndefined();
    });

    it('uses legacy regex behavior for non-ascii domains', () => {
      expect(getHostFromAddress('user@münchen.de')).toBe('m');
    });

    it('returns undefined when input exceeds max length before regex', () => {
      expect(getHostFromAddress(`${'a'.repeat(315)}@x.com`)).toBeUndefined();
    });
  });

  describe('groupRecipientsByDomain', () => {
    it('groups addresses by recipient domain', () => {
      expect(groupRecipientsByDomain(['a@foo.com', 'b@foo.com', 'c@bar.org'])).toEqual({
        'foo.com': ['a@foo.com', 'b@foo.com'],
        'bar.org': ['c@bar.org'],
      });
    });

    it('groups malformed addresses under "undefined" (legacy object-key coercion)', () => {
      expect(groupRecipientsByDomain(['not-an-email'])).toEqual({
        undefined: ['not-an-email'],
      });
    });
  });

  describe('collectRecipients', () => {
    it('merges to, cc, and bcc', () => {
      expect(
        collectRecipients({
          to: 'a@x.com',
          cc: 'b@y.com',
          bcc: 'c@z.com',
        })
      ).toEqual(['a@x.com', 'b@y.com', 'c@z.com']);
    });

    it('supports array recipient fields', () => {
      expect(
        collectRecipients({
          to: ['a@x.com', 'b@y.com'],
          cc: ['c@z.com'],
          bcc: [],
        })
      ).toEqual(['a@x.com', 'b@y.com', 'c@z.com']);
    });
  });
});
