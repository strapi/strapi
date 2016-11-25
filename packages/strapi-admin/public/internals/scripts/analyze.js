#!/usr/bin/env node

var shelljs = require('shelljs');
var animateProgress = require('./helpers/progress');
var chalk = require('chalk');
var addCheckMark = require('./helpers/checkmark');

var progress = animateProgress('Generating stats');

// Generate stats.json file with webpack
shelljs.exec(
  'webpack --config internals/webpack/webpack.prod.babel.js --profile --json > stats.json',
  addCheckMark.bind(null, callback) // Output a checkmark on completion
);

// Called after webpack has finished generating the stats.json file
function callback() {
  clearInterval(progress);
  process.stdout.write(
    '\n\nOpen ' + chalk.magenta('http://webpack.github.io/analyse/') + ' in your browser and upload the stats.json file!' +
    chalk.blue('\n(Tip: ' + chalk.italic('CMD + double-click') + ' the link!)\n\n')
  );
}
