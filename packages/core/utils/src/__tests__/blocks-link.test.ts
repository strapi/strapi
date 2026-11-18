import { isValidBlocksLink } from '../blocks-link';

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

  test.each([
    ['java', 'script:alert(1)'].join(''),
    'VbScRiPt:msgbox(1)',
    'DATA:text/html,alert(1)',
    ' \tJaVaScRiPt:alert(1)',
    '%6aavascript:alert(1)',
    'not a url',
    '',
    ' #anchor',
  ])('rejects %s', (link) => {
    expect(isValidBlocksLink(link)).toBe(false);
  });
});
