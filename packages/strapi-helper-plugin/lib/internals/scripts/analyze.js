#!/usr/bin/env node

const path = require('path');

const chalk = require('chalk');
const shelljs = require('shelljs');

const animateProgress = require('./helpers/progress');
const addCheckMark = require('./helpers/checkmark');

const progress = animateProgress('Generating stats');

// Generate stats.json file with webpack
shelljs.exec(
  `./node_modules/strapi-helper-plugin/node_modules/webpack/bin/webpack.js --config ${path.resolve(__dirname, '..', 'webpack', 'webpack.prod.babel.js')} --profile --json > stats.json`,
  addCheckMark.bind(null, callback) // Output a checkmark on completion
);

// Called after webpack has finished generating the stats.json file
function callback() {
  clearInterval(progress);
  process.stdout.write(
    `
    \n\nOpen ${chalk.magenta('http://webpack.github.io/analyse/')} in your browser and upload the stats.json file!
    ${chalk.blue('\n(Tip: (\'CMD + double-click\') the link!)\n\n')}
    `
  );
}
