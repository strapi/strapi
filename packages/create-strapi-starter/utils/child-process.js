'use strict';

const { execSync } = require('child_process');
const execa = require('execa');
const hasYarn = require('./has-yarn');

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

    await execa(`git`, [`add`, `-A`], { cwd: rootPath });

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
};
