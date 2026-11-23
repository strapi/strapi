import { toPrintableText } from '../printable-text';

describe('toPrintableText', () => {
  it('keeps plain text as it is', () => {
    expect(toPrintableText('AI BYOK')).toBe('AI BYOK');
  });

  it('removes ANSI codes, and replaces control characters with a space', () => {
    expect(
      toPrintableText('\u001B[31mContact\u001B[0m Sales.\r\n\u001B]0;title\u0007Now.\u009B')
    ).toBe('Contact Sales. Now.');
  });

  it('removes format characters, such as a right-to-left override, without adding a space', () => {
    expect(toPrintableText('Contact​ ‮selas‬ https://strapi.io/con​tact')).toBe(
      'Contact selas https://strapi.io/contact'
    );
  });

  it('collapses whitespace and trims', () => {
    expect(toPrintableText('  Bring \t your\n\nown key.  ')).toBe('Bring your own key.');
  });

  it.each([' \u001B[0m ', '', '\u200B'])('is undefined for %j, with nothing printable', (text) => {
    expect(toPrintableText(text)).toBeUndefined();
  });

  it.each([undefined, null, 42, { text: 'AI' }])(
    'is undefined for %j, which is not a string',
    (text) => {
      expect(toPrintableText(text)).toBeUndefined();
    }
  );
});
