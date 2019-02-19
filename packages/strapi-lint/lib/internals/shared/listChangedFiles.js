/**
 *
 * This source code is taken from https://github.com/facebook/react/blob/master/scripts/shared/listChangedFiles.js
 */

'use strict';

const shell = require('shelljs');

const exec = (command, args) => {
  const cmd = [command].concat(args).join(' ');

  console.log(`> ${cmd}`);

  const options = {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
    encoding: 'utf-8',
  };

  try {
    return shell.exec(cmd, {silent: true});
  } catch (err) {
    return '';
  }
};

const execGitCmd = args =>
  exec('git', args)
    .trim()
    .toString()
    .split('\n');

const listChangedFiles = () => {
  const mergeBase = execGitCmd(['merge-base', 'HEAD', 'master']);

  return new Set([
    ...execGitCmd(['diff', '--name-only', '--diff-filter=ACMRTUB', mergeBase]),
    ...execGitCmd(['ls-files', '--others', '--exclude-standard']),
  ]);
};

module.exports = listChangedFiles;
