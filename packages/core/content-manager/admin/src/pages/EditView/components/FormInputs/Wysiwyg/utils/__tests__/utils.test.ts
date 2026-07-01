import { toggleMarkdownSelection } from '../utils';

describe('toggleMarkdownSelection', () => {
  it('wraps plain text with bold markdown', () => {
    expect(toggleMarkdownSelection('hello', 'Bold')).toBe('**hello**');
  });

  it('unwraps already bold text', () => {
    expect(toggleMarkdownSelection('**hello**', 'Bold')).toBe('hello');
  });

  it('wraps plain text with italic markdown', () => {
    expect(toggleMarkdownSelection('hello', 'Italic')).toBe('_hello_');
  });

  it('unwraps already italic text', () => {
    expect(toggleMarkdownSelection('_hello_', 'Italic')).toBe('hello');
  });

  it('unwraps link markdown', () => {
    expect(toggleMarkdownSelection('[hello](https://example.com)', 'Link')).toBe('hello');
  });

  it('wraps plain text with link markdown', () => {
    expect(toggleMarkdownSelection('hello', 'Link')).toBe('[hello](link)');
  });
});
