const container = require('markdown-it-container');

module.exports = {
  anchor: {
    permalink: true,
  },
  config: md => {
    md.use(require('markdown-it-include'));
    md.use(require('markdown-it-decorate'))
      .use(...createContainer('intro'))
      .use(...createContainer('windows'))
      .use(...createContainer('ubuntu'))
      .use(...createContainer('mac'))
      .use(...createContainer('note'));
    const vuepressTabs = require('vuepress-tabs');
    vuepressTabs(md);
  },
};

function createContainer(className) {
  return [
    container,
    className,
    {
      render(tokens, idx) {
        const token = tokens[idx];
        if (token.nesting === 1) {
          return `<div class="${className} custom-block">\n`;
        } else {
          return `</div>\n`;
        }
      },
    },
  ];
}