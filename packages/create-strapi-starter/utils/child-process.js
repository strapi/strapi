'use strict';

const { execSync } = require('child_process');
const execa = require('execa');
const hasYarn = require('./has-yarn');
const logger = require('./logger');

/**
 * @param  {string} path Path to directory (frontend, backend)
 */
function runInstall(path) {
  if (hasYarn) {
    return execa('yarn', ['install'], {
      cwd: path,
      stdin: 'ignore',
    });
  }

  return execa('npm', ['install'], { cwd: path, stdin: 'ignore' });
}

function runApp(rootPath) {
  if (hasYarn) {
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
