// Import node modules.
const { exec } = require('child_process');
const path = require('path');

const _ = require('lodash');

const addCheckMark = require('./helpers/checkmark');
const animateProgress = require('./helpers/progress');
const pkg = require(path.resolve(__dirname, '..', '..', '..', 'package.json'));

process.stdin.resume();
process.stdin.setEncoding('utf8');
let interval;

// List of necessary dependencies.
const helperDependencies = [
  'cross-env',
  'plop',
  'prettier',
  'rimraf',
  'webpack',
];

/**
 * Define the list of necessary dependencies, with their respective versions.
 */
const necessaryDependencies = _.map(
  _.pickBy(pkg.dependencies, (version, devDependency) =>
    _.includes(helperDependencies, devDependency) || _.startsWith(devDependency, 'eslint')
  ), (version, devDependency) =>
    `${devDependency}@${version}`
);

/**
 * Install necessary dependencies.
 */
const installNecessaryDeps = () => {
  process.stdout.write('\nInstalling necessary dependencies');
  interval = animateProgress('Installing necessary dependencies');

  // Exec installation.
  exec(`npm install ${necessaryDependencies.join(' ')} --save-dev`, addCheckMark.bind(null, installDepsCallback));
};

/**
 * Callback function after installing dependencies.
 */
const installDepsCallback = (error) => {
  clearInterval(interval);
  process.stdout.write('\n');
  if (error) {
    process.stderr.write(error);
    process.stdout.write('\n');
    process.exit(1);
  }

  process.exit(0);
};

installNecessaryDeps();
