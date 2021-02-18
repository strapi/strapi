'use strict';

const { execSync } = require('child_process');
const execa = require('execa');
const hasYarn = require('./has-yarn');

const installArguments = ['install', '--production', '--no-optional'];
/**
 * @param  {string} path Path to directory (frontend, backend)
 */
function runInstall(path) {
  if (hasYarn) {
    return execa('yarn', installArguments, {
      cwd: path,
      stdin: 'ignore',
    });
  }

  return execa('npm', installArguments, { cwd: path, stdin: 'ignore' });
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

function initGit(rootPath) {
  return execa('git', ['init'], {
    cwd: rootPath,
  });
}

async function createInitialGitCommit(rootPath) {
  await execa(`git`, [`add`, `-A`], { cwd: rootPath });

  try {
    execSync(`git commit -m "Create Strapi starter project"`, {
      cwd: rootPath,
    });
  } catch (err) {
    console.error(err);
  }
}

module.exports = {
  runInstall,
  runApp,
  initGit,
  createInitialGitCommit,
};
