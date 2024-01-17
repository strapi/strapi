import { getLanguage, highlight, highlightAuto } from 'highlight.js';
import Markdown from 'markdown-it';
// @ts-expect-error - library does not export types
import abbr from 'markdown-it-abbr';
import container from 'markdown-it-container';
// @ts-expect-error - library does not export types
import deflist from 'markdown-it-deflist';
import emoji from 'markdown-it-emoji';
import footnote from 'markdown-it-footnote';
// @ts-expect-error - library does not export types
import ins from 'markdown-it-ins';
// @ts-expect-error - library does not export types
import mark from 'markdown-it-mark';
// @ts-expect-error - library does not export types
import sub from 'markdown-it-sub';
// @ts-expect-error - library does not export types
import sup from 'markdown-it-sup';

import 'highlight.js/styles/solarized-dark.css';

const md: Markdown = new Markdown({
  html: true, // Enable HTML tags in source
  xhtmlOut: false,
  breaks: true,
  langPrefix: 'language-',
  linkify: true,
  typographer: true,
  // Code from: https://github.com/markdown-it/markdown-it/blob/master/support/demo_template/index.js#L83
  highlight(str, lang) {
    if (lang && lang !== 'auto' && getLanguage(lang)) {
      return (
        '<pre class="hljs language-' +
        md.utils.escapeHtml(lang.toLowerCase()) +
        '"><code>' +
        highlight(lang, str, true).value +
        '</code></pre>'
      );
    }

    if (lang === 'auto') {
      const result = highlightAuto(str);

      return (
        '<pre class="hljs language-' +
        md.utils.escapeHtml(result.language!) +
        '"><code>' +
        result.value +
        '</code></pre>'
      );
    }

    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  },
})
  .use(abbr)
  .use(container, 'warning')
  .use(container, 'tip')
  .use(deflist)
  .use(emoji)
  .use(footnote)
  .use(ins)
  .use(mark)
  .use(sub)
  .use(sup);

// Code from: https://github.com/markdown-it/markdown-it-footnote/blob/master/index.js#L29
md.renderer.rules.footnote_ref = (tokens, idx, options, env, slf) => {
  const caption = slf.rules.footnote_caption?.(tokens, idx, options, env, slf);

  return '<sup class="footnote-ref"><span>' + caption + '</span></sup>';
};

md.renderer.rules.footnote_anchor = () => {
  /* ↩ with escape code to prevent display as Apple Emoji on iOS */
  return ' <span class="footnote-backref">\u21a9\uFE0E</span>';
};

export { md };
