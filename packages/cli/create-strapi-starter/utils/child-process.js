'use strict';

const { execSync } = require('child_process');
const execa = require('execa');
const logger = require('./logger');

/**
 * @param {Object} options
 * @param {string} options.path Path to directory (frontend, backend)
 * @param {boolean} options.useYarn Use yarn instead of npm
 */
function runInstall({ path, useYarn }) {
  if (useYarn) {
    return execa('yarn', ['install'], {
      cwd: path,
      stdin: 'ignore',
    });
  }

  return execa('npm', ['install'], { cwd: path, stdin: 'ignore' });
}

/**
 * @param {Object} options
 * @param {string} options.rootPath
 * @param {boolean} options.useYarn
 */
function runApp({ rootPath, useYarn }) {
  if (useYarn) {
    return execa('yarn', ['develop'], {
      stdio: 'inherit',
      cwd: rootPath,
    });
  } else {
    return execa('npm', ['run', 'develop'], {
      stdio: 'inherit',
      cwd: rootPath,
    });
  }
}

async function initGit(rootPath) {
  try {
    await execa('git', ['init'], {
      cwd: rootPath,
    });
  } catch (err) {
    logger.warn(`Could not initialize a git repository`);
  }

  try {
    await execa(`git`, [`add`, `-A`], { cwd: rootPath });

    execSync(`git commit -m "Create Strapi starter project"`, {
      cwd: rootPath,
    });
  } catch (err) {
    logger.warn(`Could not create initial git commit`);
  }
}

module.exports = {
  runInstall,
  runApp,
  initGit,
};
