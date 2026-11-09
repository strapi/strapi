/* eslint-disable no-script-url */
import { describe, expect, it } from 'vitest';

import { buildSampleData, render } from '../render';

describe('render of links and images', () => {
  const renderHtml = (html: string, url: unknown) =>
    render(html, ['url', 'name'], { url, name: 'Ana' }, 'html');

  it('keeps an http, https or mailto value in href and src', () => {
    expect(renderHtml('<a href="{{ url }}">x</a>', 'https://x.test/?a=1&b=2')).toBe(
      '<a href="https://x.test/?a=1&amp;b=2">x</a>'
    );
    expect(renderHtml("<img src='{{url}}'>", 'HTTP://x.test/a.png')).toBe(
      "<img src='HTTP://x.test/a.png'>"
    );
    expect(renderHtml('<a href="{{ url }}">x</a>', 'mailto:a@b.c')).toBe(
      '<a href="mailto:a@b.c">x</a>'
    );
  });

  it.each([
    'javascript:alert(1)',
    ' \tjavascript:alert(1)',
    'data:text/html,x',
    '/relative',
    '',
    undefined,
  ])('replaces the value %j in href and src with an empty value', (value) => {
    expect(renderHtml('<a href="{{ url }}">x</a>', value)).toBe('<a href="">x</a>');
    expect(renderHtml('<img src="{{ url }}">', value)).toBe('<img src="">');
    expect(renderHtml('<a href={{ url }}>x</a>', value)).toBe('<a href=>x</a>');
  });

  it('does not touch text, other attributes or text mode', () => {
    expect(renderHtml('<p title="{{ url }}">{{ url }}</p>', 'javascript:x')).toBe(
      '<p title="javascript:x">javascript:x</p>'
    );
    expect(render('<a href="{{ url }}">', ['url'], { url: 'javascript:x' }, 'text')).toBe(
      '<a href="javascript:x">'
    );
  });

  it('leaves a link without a placeholder, and undeclared placeholders, alone', () => {
    expect(renderHtml('<a href="#">x</a><a href="{{ other }}">y</a>', 'https://x.test')).toBe(
      '<a href="#">x</a><a href="{{ other }}">y</a>'
    );
  });

  it('reads the attributes of a tag one by one, so a decoy inside another value is not an attribute', () => {
    expect(renderHtml('<a title="x href=" href="{{ url }}">x</a>', 'javascript:alert(1)')).toBe(
      '<a title="x href=" href="">x</a>'
    );
    expect(renderHtml("<a title='src=\"' href='{{ url }}'>x</a>", 'javascript:alert(1)')).toBe(
      "<a title='src=\"' href=''>x</a>"
    );
    expect(renderHtml('<a title="x href={{ url }}" href="#">x</a>', 'javascript:alert(1)')).toBe(
      '<a title="x href=javascript:alert(1)" href="#">x</a>'
    );
    expect(renderHtml('<a title="x href=" href="{{ url }}">x</a>', 'https://x.test')).toBe(
      '<a title="x href=" href="https://x.test">x</a>'
    );
  });

  it('checks unquoted and unspaced attributes too', () => {
    expect(renderHtml('<a title=x href={{ url }}>x</a>', 'javascript:alert(1)')).toBe(
      '<a title=x href=>x</a>'
    );
    expect(renderHtml('<a title="x"href="{{ url }}">x</a>', 'javascript:alert(1)')).toBe(
      '<a title="x"href="">x</a>'
    );
    expect(renderHtml('<a HREF = {{ url }}>x</a>', 'https://x.test/a')).toBe(
      '<a HREF = https://x.test/a>x</a>'
    );
    expect(renderHtml('<img alt=a src={{url}} />', 'data:text/html,x')).toBe('<img alt=a src= />');
  });

  it('never reads a substituted value as a placeholder', () => {
    expect(renderHtml('<a href="{{ url }}">{{ name }}</a>', 'https://x.test/{{ name }}')).toBe(
      '<a href="https://x.test/{{ name }}">Ana</a>'
    );
  });
});

describe('render', () => {
  it('substitutes declared variables, nested ones included', () => {
    expect(render('Hi {{ user.name }}', ['user.name'], { user: { name: 'Ana' } }, 'text')).toBe(
      'Hi Ana'
    );
    expect(render('{{url}} and {{ url }}', ['url'], { url: 'https://x.test' }, 'text')).toBe(
      'https://x.test and https://x.test'
    );
  });

  it('leaves undeclared names, <% %> blocks and constructor lookups as literal text', () => {
    const source =
      '{{ other }} {{ constructor }} {{ __proto__ }} <%= name %> <% 1 + 1 %> {{ 1 + 1 }}';
    const data = { other: 'nope', name: 'Ana' };

    expect(render(source, ['name'], data, 'text')).toBe(source);
    expect(render(source, ['name'], data, 'html')).toBe(source);
  });

  it('reads own properties only, even for declared names', () => {
    const inherited = Object.create({ name: 'from the prototype' });

    expect(render('{{ name }}|{{ constructor }}', ['name', 'constructor'], inherited, 'text')).toBe(
      '|'
    );
  });

  it('escapes values in html mode and not in text mode', () => {
    const data = { name: '<b>"Ana" & \'co\'</b>' };

    expect(render('{{ name }}', ['name'], data, 'html')).toBe(
      '&lt;b&gt;&quot;Ana&quot; &amp; &#39;co&#39;&lt;/b&gt;'
    );
    expect(render('{{ name }}', ['name'], data, 'text')).toBe('<b>"Ana" & \'co\'</b>');
  });

  it('does not escape the template markup itself', () => {
    expect(render('<p>{{ name }}</p>', ['name'], { name: 'Ana' }, 'html')).toBe('<p>Ana</p>');
  });

  it('renders a missing value as an empty string', () => {
    expect(render('[{{ user.name }}][{{ other }}]', ['user.name', 'other'], {}, 'text')).toBe(
      '[][]'
    );
    expect(render('[{{ name }}]', ['name'], { name: null }, 'text')).toBe('[]');
  });

  it('does not substitute inside substituted values', () => {
    expect(render('{{ a }}', ['a', 'b'], { a: '{{ b }}', b: 'x' }, 'text')).toBe('{{ b }}');
  });
});

describe('buildSampleData', () => {
  it('gives a URL variable a sample a link keeps, and the others a bracketed name', () => {
    const data = buildSampleData(['url', 'user.name', 'app.link'], ['url', 'app.link']);

    expect(data).toEqual({
      url: 'https://example.com/url',
      user: { name: '[user.name]' },
      app: { link: 'https://example.com/app.link' },
    });
    expect(render('<a href="{{ url }}">x</a>', ['url'], data, 'html')).toBe(
      '<a href="https://example.com/url">x</a>'
    );
  });

  it('builds nested sample data from the variable list', () => {
    expect(buildSampleData(['url', 'user.name', 'user.email'])).toEqual({
      url: '[url]',
      user: { name: '[user.name]', email: '[user.email]' },
    });
  });
});
