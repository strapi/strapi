import { md } from '../mdRenderer';
import { sanitize } from '../sanitizer';

/**
 * These tests pin down the contract that the markdown preview's HTML sanitizer
 * is expected to honor. They mirror the prior sanitize-html configuration:
 *
 *   - allowedTags:      false (all standard markdown tags pass through)
 *   - allowedAttributes:
 *       '*':    href, align, alt, center, width, height, type, controls, target
 *       img:    src, alt
 *       source: src, type
 *   - allowedSchemes:   http, https, ftp, mailto, tel (+ protocol-relative)
 *
 * Anything outside that allowlist must be stripped.
 */
describe('Wysiwyg sanitize', () => {
  describe('tags rendered by markdown-it pass through', () => {
    it.each([
      '<h1>Title</h1>',
      '<h2>Title</h2>',
      '<p>Paragraph</p>',
      '<em>em</em>',
      '<strong>strong</strong>',
      '<ul><li>item</li></ul>',
      '<ol><li>item</li></ol>',
      '<blockquote>quote</blockquote>',
      '<code>inline</code>',
      '<pre><code>block</code></pre>',
      '<table><thead><tr><th>h</th></tr></thead><tbody><tr><td>c</td></tr></tbody></table>',
    ])('preserves %s', (html) => {
      expect(sanitize(html)).toBe(html);
    });
  });

  describe('allowed attributes', () => {
    it('keeps href on anchors', () => {
      expect(sanitize('<a href="https://example.com">x</a>')).toBe(
        '<a href="https://example.com">x</a>'
      );
    });

    it('keeps target on anchors', () => {
      expect(sanitize('<a href="https://example.com" target="_blank">x</a>')).toContain(
        'target="_blank"'
      );
    });

    it('keeps src and alt on images', () => {
      const result = sanitize('<img src="https://example.com/a.png" alt="Alt text" />');
      expect(result).toContain('src="https://example.com/a.png"');
      expect(result).toContain('alt="Alt text"');
    });

    it('keeps controls, width, height on video', () => {
      const result = sanitize('<video controls width="320" height="240"></video>');
      expect(result).toContain('controls');
      expect(result).toContain('width="320"');
      expect(result).toContain('height="240"');
    });

    it('keeps src and type on <source> inside <video>', () => {
      const result = sanitize(
        '<video controls><source src="https://example.com/v.mp4" type="video/mp4" /></video>'
      );
      expect(result).toContain('src="https://example.com/v.mp4"');
      expect(result).toContain('type="video/mp4"');
    });

    it('keeps align on table cells', () => {
      const html = '<table><tbody><tr><td align="center">x</td></tr></tbody></table>';
      expect(sanitize(html)).toContain('align="center"');
    });
  });

  describe('disallowed attributes are stripped', () => {
    it.each([
      ['class', '<pre class="hljs language-js">x</pre>'],
      ['id', '<p id="footnote-1">x</p>'],
      ['style', '<p style="color:red">x</p>'],
      ['onclick', '<a href="https://x" onclick="alert(1)">x</a>'],
      ['onerror', '<img src="https://x" onerror="alert(1)" />'],
      ['data-foo', '<p data-foo="bar">x</p>'],
      ['name', '<a href="https://x" name="anchor">x</a>'],
    ])('strips %s', (attr, html) => {
      expect(sanitize(html)).not.toMatch(new RegExp(`\\b${attr}=`));
    });
  });

  describe('URL scheme allowlist', () => {
    it.each([
      ['http://example.com', 'http://example.com'],
      ['https://example.com', 'https://example.com'],
      ['ftp://example.com', 'ftp://example.com'],
      ['mailto:user@example.com', 'mailto:user@example.com'],
      ['tel:+15555550123', 'tel:+15555550123'],
      ['//cdn.example.com/x', '//cdn.example.com/x'],
      ['#anchor', '#anchor'],
      ['/relative/path', '/relative/path'],
    ])('preserves href=%s', (href, expected) => {
      expect(sanitize(`<a href="${href}">x</a>`)).toContain(`href="${expected}"`);
    });

    it.each([
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'vbscript:msgbox(1)',
      'data:text/html,x',
    ])('strips dangerous href=%s', (href) => {
      const result = sanitize(`<a href="${href}">x</a>`);
      expect(result.toLowerCase()).not.toContain('javascript:');
      expect(result.toLowerCase()).not.toContain('vbscript:');
      expect(result.toLowerCase()).not.toContain('data:text/html');
    });

    it('strips javascript: from img src', () => {
      const result = sanitize('<img src="javascript:alert(1)" alt="x" />');
      expect(result.toLowerCase()).not.toContain('javascript:');
    });
  });

  describe('script handling', () => {
    /**
     * Stricter than the prior sanitize-html `allowedTags: false` config, which
     * preserved <script> when explicitly authored in the markdown source.
     * DOMPurify removes them unconditionally; we keep that behavior because
     * preserving raw <script> in the preview was an XSS hole, not a feature.
     */
    it('strips <script> tags and their contents', () => {
      const result = sanitize('<p>safe</p><script>alert(1)</script>');
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert(1)');
      expect(result).toContain('<p>safe</p>');
    });
  });

  describe('end-to-end with markdown-it', () => {
    it('renders a representative markdown document into safe HTML', () => {
      const source = [
        '# Title',
        '',
        'Paragraph with [link](https://example.com), `code`, and **bold**.',
        '',
        '![alt](https://example.com/image.png)',
        '',
        '> quote',
        '',
        '- one',
        '- two',
      ].join('\n');

      const html = sanitize(md.render(source));

      expect(html).toContain('<h1>Title</h1>');
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('src="https://example.com/image.png"');
      expect(html).toContain('alt="alt"');
      expect(html).toContain('<code>code</code>');
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<blockquote>');
      expect(html).toMatch(/<ul>\s*<li>one<\/li>/);
    });

    it('strips inline HTML script blocks embedded in markdown source', () => {
      const html = sanitize(md.render('Hello\n\n<script>alert(1)</script>'));
      expect(html).not.toContain('<script');
      expect(html).not.toContain('alert(1)');
    });
  });
});
