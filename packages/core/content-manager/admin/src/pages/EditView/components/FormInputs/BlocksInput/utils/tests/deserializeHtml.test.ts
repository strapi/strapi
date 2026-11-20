import { readFileSync } from 'fs';
import path from 'path';

import { deserializeHtml } from '../deserializeHtml';

const text = (value: string, modifiers = {}) => ({ type: 'text', text: value, ...modifiers });
const paragraph = (...children: unknown[]) => ({ type: 'paragraph', children });

describe('deserializeHtml', () => {
  describe('block-level elements', () => {
    it.each([
      ['<h1>Title</h1>', { type: 'heading', level: 1, children: [text('Title')] }],
      ['<h3>Sub</h3>', { type: 'heading', level: 3, children: [text('Sub')] }],
      ['<p>Text</p>', paragraph(text('Text'))],
      [
        '<ul><li>A</li></ul>',
        {
          type: 'list',
          format: 'unordered',
          indentLevel: 0,
          children: [{ type: 'list-item', children: [text('A')] }],
        },
      ],
      [
        '<ol><li>A</li></ol>',
        {
          type: 'list',
          format: 'ordered',
          indentLevel: 0,
          children: [{ type: 'list-item', children: [text('A')] }],
        },
      ],
      ['<blockquote>Q</blockquote>', { type: 'quote', children: [text('Q')] }],
      ['<pre><code>x</code></pre>', { type: 'code', language: 'plaintext', children: [text('x')] }],
    ])('maps %s', (html, expected) => {
      expect(deserializeHtml(html)).toEqual([expected]);
    });

    it('does not create empty blocks', () => {
      expect(
        deserializeHtml('<p>One</p>\n<p> </p><br><hr><p>&nbsp;</p><div></div>\n<p>Two</p>')
      ).toEqual([paragraph(text('One')), paragraph(text('Two'))]);
    });

    it('turns a quote with several paragraphs into several quotes', () => {
      expect(deserializeHtml('<blockquote><p>A</p><p>B</p></blockquote>')).toEqual([
        { type: 'quote', children: [text('A')] },
        { type: 'quote', children: [text('B')] },
      ]);
    });

    it('keeps the line breaks and indentation of code blocks', () => {
      expect(deserializeHtml('<pre>const a = 1;\n  if (a) {\n    go();\n  }\n</pre>')).toEqual([
        {
          type: 'code',
          language: 'plaintext',
          children: [text('const a = 1;\n  if (a) {\n    go();\n  }')],
        },
      ]);
    });

    it('keeps line breaks inside a paragraph', () => {
      expect(deserializeHtml('<p>Line one<br>Line two<br></p>')).toEqual([
        paragraph(text('Line one\nLine two')),
      ]);
    });

    it('keeps the text of table cells as paragraphs', () => {
      expect(
        deserializeHtml(
          '<table><tr><th>Name</th><th>Age</th></tr><tr><td>Ada</td><td>36</td></tr></table>'
        )
      ).toEqual([
        paragraph(text('Name')),
        paragraph(text('Age')),
        paragraph(text('Ada')),
        paragraph(text('36')),
      ]);
    });

    it('wraps loose text between blocks in a paragraph', () => {
      expect(deserializeHtml('Intro <b>text</b><h2>Title</h2>outro')).toEqual([
        paragraph(text('Intro '), text('text', { bold: true })),
        { type: 'heading', level: 2, children: [text('Title')] },
        paragraph(text('outro')),
      ]);
    });
  });

  describe('inline modifiers', () => {
    it.each([
      ['<strong>x</strong>', { bold: true }],
      ['<span style="font-weight:bold">x</span>', { bold: true }],
      ['<span style="font-weight:700">x</span>', { bold: true }],
      ['<em>x</em>', { italic: true }],
      ['<span style="font-style:italic">x</span>', { italic: true }],
      ['<u>x</u>', { underline: true }],
      ['<span style="text-decoration:underline">x</span>', { underline: true }],
      ['<s>x</s>', { strikethrough: true }],
      ['<span style="text-decoration:line-through">x</span>', { strikethrough: true }],
      ['<code>x</code>', { code: true }],
    ])('keeps %s', (html, modifiers) => {
      expect(deserializeHtml(`<p>${html}</p>`)).toEqual([paragraph(text('x', modifiers))]);
    });

    it('combines nested modifiers', () => {
      expect(deserializeHtml('<p>a <b>bold <i>both</i></b> end</p>')).toEqual([
        paragraph(
          text('a '),
          text('bold ', { bold: true }),
          text('both', { bold: true, italic: true }),
          text(' end')
        ),
      ]);
    });

    it('lets an inline style remove a modifier given by the tag', () => {
      expect(deserializeHtml('<p><b style="font-weight:normal">plain</b></p>')).toEqual([
        paragraph(text('plain')),
      ]);
    });

    it('strips unsupported styling without losing text', () => {
      expect(
        deserializeHtml(
          '<p><mark style="background:yellow">flagged</mark> <span style="color:red;font-size:20px">red</span></p>'
        )
      ).toEqual([paragraph(text('flagged red'))]);
    });

    it('collapses whitespace like a browser does', () => {
      expect(deserializeHtml('<p>\n   Hello\n   <b> world </b>  again  </p>')).toEqual([
        paragraph(text('Hello '), text('world ', { bold: true }), text('again')),
      ]);
    });
  });

  describe('links', () => {
    it('keeps external links', () => {
      expect(deserializeHtml('<p>See <a href="https://example.com">docs</a>.</p>')).toEqual([
        paragraph(
          text('See '),
          {
            type: 'link',
            url: 'https://example.com',
            rel: '',
            target: '',
            children: [text('docs')],
          },
          text('.')
        ),
      ]);
    });

    it('keeps relative links', () => {
      expect(deserializeHtml('<p><a href="/articles/my-post">post</a></p>')[0]).toMatchObject({
        children: [{ type: 'link', url: '/articles/my-post' }],
      });
    });

    it('drops the underline sources add to link text', () => {
      expect(
        deserializeHtml(
          '<p><a href="https://example.com"><span style="text-decoration:underline;font-weight:700">docs</span></a></p>'
        )
      ).toEqual([
        paragraph({
          type: 'link',
          url: 'https://example.com',
          rel: '',
          target: '',
          children: [text('docs', { bold: true })],
        }),
      ]);
    });

    it.each(['javascript:alert(1)', '#section', '//evil.example.com/page', ''])(
      'keeps the text but drops the link for the url "%s"',
      (url) => {
        expect(deserializeHtml(`<p><a href="${url}">click</a></p>`)).toEqual([
          paragraph(text('click')),
        ]);
      }
    );
  });

  describe('lists', () => {
    it('maps nested lists to the nested list model of the editor', () => {
      expect(
        deserializeHtml('<ul><li>A<ol><li>A.1</li><li>A.2</li></ol></li><li>B</li></ul>')
      ).toEqual([
        {
          type: 'list',
          format: 'unordered',
          indentLevel: 0,
          children: [
            { type: 'list-item', children: [text('A')] },
            {
              type: 'list',
              format: 'ordered',
              indentLevel: 1,
              children: [
                { type: 'list-item', children: [text('A.1')] },
                { type: 'list-item', children: [text('A.2')] },
              ],
            },
            { type: 'list-item', children: [text('B')] },
          ],
        },
      ]);
    });

    it('keeps several paragraphs of an item as line breaks', () => {
      expect(deserializeHtml('<ul><li><p>One</p><p>Two</p></li></ul>')[0]).toMatchObject({
        children: [{ type: 'list-item', children: [text('One\nTwo')] }],
      });
    });
  });

  describe('Google Docs', () => {
    // Trimmed copy of what Google Docs puts in the clipboard
    const googleDocsHtml = `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1234"><h1 dir="ltr" style="line-height:1.38;margin-top:20pt;margin-bottom:6pt;"><span style="font-size:20pt;font-family:Arial,sans-serif;color:#000000;font-weight:400;font-style:normal;text-decoration:none;">Release notes</span></h1><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;font-weight:400;font-style:normal;">We shipped </span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;font-weight:700;font-style:normal;">paste</span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;font-weight:400;font-style:italic;"> with formatting</span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;font-weight:400;">. Read the </span><a href="https://strapi.io/blog" style="text-decoration:none;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#1155cc;font-weight:400;text-decoration:underline;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;">blog</span></a><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;font-weight:400;">.</span></p><br><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:11pt;" aria-level="1"><p dir="ltr" role="presentation" style="line-height:1.38;"><span style="font-size:11pt;font-weight:400;">First</span></p></li><li dir="ltr" style="list-style-type:circle;font-size:11pt;" aria-level="2"><p dir="ltr" role="presentation" style="line-height:1.38;"><span style="font-size:11pt;font-weight:400;">Nested</span></p></li><li dir="ltr" style="list-style-type:disc;font-size:11pt;" aria-level="1"><p dir="ltr" role="presentation" style="line-height:1.38;"><span style="font-size:11pt;font-weight:400;">Second</span></p></li></ul></b><br class="Apple-interchange-newline">`;

    it('keeps the structure and formatting', () => {
      expect(deserializeHtml(googleDocsHtml)).toEqual([
        { type: 'heading', level: 1, children: [text('Release notes')] },
        paragraph(
          text('We shipped '),
          text('paste', { bold: true }),
          text(' with formatting', { italic: true }),
          text('. Read the '),
          {
            type: 'link',
            url: 'https://strapi.io/blog',
            rel: '',
            target: '',
            children: [text('blog')],
          },
          text('.')
        ),
        {
          type: 'list',
          format: 'unordered',
          indentLevel: 0,
          children: [
            { type: 'list-item', children: [text('First')] },
            {
              type: 'list',
              format: 'unordered',
              indentLevel: 1,
              children: [{ type: 'list-item', children: [text('Nested')] }],
            },
            { type: 'list-item', children: [text('Second')] },
          ],
        },
      ]);
    });
  });

  describe('Microsoft Word', () => {
    // Trimmed copy of what Word (desktop) puts in the clipboard: lists are paragraphs
    const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><style><!-- p.MsoNormal {margin:0cm;} --></style></head><body lang=EN-US>
<!--StartFragment-->
<h2>Agenda<o:p></o:p></h2>
<p class=MsoNormal>Intro with <b>bold</b> and <i>italic</i>.<o:p></o:p></p>
<p class=MsoListParagraphCxSpFirst style='text-indent:-18.0pt;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='font-family:Symbol;mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span><![endif]>Bullet one<o:p></o:p></p>
<p class=MsoListParagraphCxSpLast style='margin-left:72.0pt;text-indent:-18.0pt;mso-list:l0 level2 lfo1'><![if !supportLists]><span style='font-family:"Courier New";mso-list:Ignore'>o<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp; </span></span><![endif]>Sub bullet<o:p></o:p></p>
<p class=MsoNormal><o:p>&nbsp;</o:p></p>
<p class=MsoListParagraph style='text-indent:-18.0pt;mso-list:l1 level1 lfo2'><![if !supportLists]><span style='mso-list:Ignore'>1.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp; </span></span><![endif]>Step one<o:p></o:p></p>
<p class=MsoListParagraph style='text-indent:-18.0pt;mso-list:l1 level1 lfo2'><![if !supportLists]><span style='mso-list:Ignore'>2.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp; </span></span><![endif]>Step two<o:p></o:p></p>
<!--EndFragment-->
</body></html>`;

    it('keeps the structure and turns list paragraphs into lists', () => {
      expect(deserializeHtml(wordHtml)).toEqual([
        { type: 'heading', level: 2, children: [text('Agenda')] },
        paragraph(
          text('Intro with '),
          text('bold', { bold: true }),
          text(' and '),
          text('italic', { italic: true }),
          text('.')
        ),
        {
          type: 'list',
          format: 'unordered',
          indentLevel: 0,
          children: [
            { type: 'list-item', children: [text('Bullet one')] },
            {
              type: 'list',
              format: 'unordered',
              indentLevel: 1,
              children: [{ type: 'list-item', children: [text('Sub bullet')] }],
            },
          ],
        },
        {
          type: 'list',
          format: 'ordered',
          indentLevel: 0,
          children: [
            { type: 'list-item', children: [text('Step one')] },
            { type: 'list-item', children: [text('Step two')] },
          ],
        },
      ]);
    });
  });

  it('ignores images, scripts and styles', () => {
    expect(
      deserializeHtml(
        '<style>p{color:red}</style><script>alert(1)</script><p>Before<img src="x.png" alt="x">after</p>'
      )
    ).toEqual([paragraph(text('Beforeafter'))]);
  });

  it('turns code copied from an IDE into a code block that keeps its indentation', () => {
    // Shape of what VS Code puts in the clipboard
    const html =
      '<div style="font-family: Menlo; white-space: pre;"><div><span>function go() {</span></div><div><span>  return 1;</span></div><div><span>}</span></div></div>';

    expect(deserializeHtml(html)).toEqual([
      {
        type: 'code',
        language: 'plaintext',
        children: [text('function go() {\n  return 1;\n}')],
      },
    ]);
  });

  it('gives up on huge content, so the paste falls back to plain text', () => {
    expect(deserializeHtml(`<div>${'<span>x</span>'.repeat(50_001)}</div>`)).toEqual([]);
  });

  it('reads the headings Word Online writes as paragraphs with a heading role', () => {
    expect(
      deserializeHtml(
        '<p role="heading" aria-level="2"><span style="font-weight:bold">Experience</span></p><p>Text <b>with bold</b><span> </span><br>next line</p>'
      )
    ).toEqual([
      { type: 'heading', level: 2, children: [text('Experience')] },
      paragraph(text('Text '), text('with bold', { bold: true }), text('\nnext line')),
    ]);
  });

  describe('real clipboard content', () => {
    const textOf = (node: { text?: string; children?: unknown[] }): string =>
      node.text ?? (node.children ?? []).map((child) => textOf(child as typeof node)).join('');

    it.each(['google-docs', 'word-online'])('keeps all the text of %s', (name) => {
      const html = readFileSync(path.join(__dirname, 'fixtures', `${name}.html`), 'utf8');
      const plainText = readFileSync(path.join(__dirname, 'fixtures', `${name}.txt`), 'utf8');

      const blocks = deserializeHtml(html);
      const pastedText = blocks.map(textOf).join(' ');
      const missingWords = plainText
        .split(/\s+/)
        .filter((word) => word && !pastedText.includes(word));

      expect(missingWords).toEqual([]);
      expect(blocks.map((block) => block.type)).toMatchSnapshot();
    });
  });
});
