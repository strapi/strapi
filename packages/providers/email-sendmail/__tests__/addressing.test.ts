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
  });

  describe('getHostFromAddress', () => {
    it('returns domain after @', () => {
      expect(getHostFromAddress('user@mail.example.org')).toBe('mail.example.org');
    });
  });

  describe('groupRecipientsByDomain', () => {
    it('groups addresses by recipient domain', () => {
      expect(groupRecipientsByDomain(['a@foo.com', 'b@foo.com', 'c@bar.org'])).toEqual({
        'foo.com': ['a@foo.com', 'b@foo.com'],
        'bar.org': ['c@bar.org'],
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
  });
});
