const postcssSmartImport = require('postcss-smart-import');
const precss = require('precss');
const autoprefixer = require('autoprefixer');

module.exports = {
  plugins: [postcssSmartImport(), precss(), autoprefixer()],
};
