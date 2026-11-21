import * as blocksLink from '../blocks-link';

const { isValidAbsoluteBlocksLink, isValidBlocksLink } = blocksLink;

const unsafe = [
  ['java', 'script:alert(1)'].join(''),
  'VbScRiPt:msgbox(1)',
  'DATA:text/html,alert(1)',
  ' \tJaVaScRiPt:alert(1)',
  '%6aavascript:alert(1)',
];

describe('blocks-link', () => {
  test('does not expose the protocol allow-list', () => {
    expect(blocksLink).not.toHaveProperty('ALLOWED_LINK_PROTOCOLS');
  });

  describe('isValidBlocksLink', () => {
    test.each([
      '/about',
      '//example.com',
      '#anchor',
      '#section-2',
      'https://example.com',
      'http://example.com',
      'mailto:info@strapi.io',
      'tel:+15555550123',
      'ftp://example.com',
    ])('accepts %s', (link) => {
      expect(isValidBlocksLink(link)).toBe(true);
    });

    test.each([...unsafe, 'not a url', '', ' #anchor', '#'])('rejects %s', (link) => {
      expect(isValidBlocksLink(link)).toBe(false);
    });
  });

  describe('isValidAbsoluteBlocksLink', () => {
    test.each(['https://example.com', 'mailto:info@strapi.io', 'tel:+15555550123'])(
      'accepts %s',
      (link) => {
        expect(isValidAbsoluteBlocksLink(link)).toBe(true);
      }
    );

    test.each([...unsafe, '/relative', '//example.com', '#anchor'])('rejects %s', (link) => {
      expect(isValidAbsoluteBlocksLink(link)).toBe(false);
    });
  });
});
