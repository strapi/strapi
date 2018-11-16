const postcssFocus = require('postcss-focus');
const cssnext = require('postcss-cssnext');
const postcssReporter = require('postcss-reporter');

const postcssPlugins = [
  postcssFocus(), // Add a :focus to every :hover
  cssnext({
    // Allow future CSS features to be used, also auto-prefixes the CSS...
    browsers: ['last 2 versions', 'IE > 10'], // ...based on this browser list
  }),
  postcssReporter({
    // Posts messages from plugins to the terminal
    clearMessages: true,
  }),
];

module.exports = { postcssPlugins };
