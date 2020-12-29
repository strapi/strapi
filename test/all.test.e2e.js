'use strict';

const path = require('path');
const { flatMap, uniq, negate } = require('lodash/fp');
const glob = require('glob');
const chalk = require('chalk');

const fileExtension = '.test.e2e.js';
const filePattern = `*${fileExtension}`;

const defaultPaths = ['packages/'];

const testPaths = process.env.STRAPI_TEST_PATHS;
const paths = testPaths ? testPaths.split(' ') : defaultPaths;

// glob options
const cwd = path.resolve(__dirname, '..');
const ignore = ['**/node_modules/**'];

// Helpers
const isE2eTestFile = p => p.endsWith(fileExtension);
const filesFromPaths = flatMap(p => glob.sync(`${p}/**/${filePattern}`, { ignore, cwd }));

// Fetch file list based on paths
const directoriesPath = paths.filter(negate(isE2eTestFile));
const filesPath = paths.filter(isE2eTestFile);

const files = uniq(filesPath.concat(filesFromPaths(directoriesPath)));
const len = files.length;

// Iterate over each file path and create a test suite by requiring it.
let it = 0;
for (const file of files) {
  const { dir, name } = path.parse(file);
  const normalizedPath = path.resolve(cwd, dir, name);

  it++;
  const percentage = Math.round((it / len) * 100);
  const fileIndex = it;

  describe(name, () => {
    beforeAll(() => {
      process.stdout.write(chalk.blue(`[${fileIndex}/${len}] (${percentage}%) Running ${file}\n`));
    });

    // Load the test inside this suite
    require(normalizedPath);
  });
}
