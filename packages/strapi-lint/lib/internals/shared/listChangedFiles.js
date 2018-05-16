/**
 *
 * This source code is taken from https://github.com/facebook/react/blob/master/scripts/shared/listChangedFiles.js
 */

'use strict';

const execFileSync = require('child_process').execFileSync;

const exec = (command, args) => {
 console.log('> ' + [command].concat(args).join(' '));
 const options = {
   cwd: process.cwd(),
   env: process.env,
   stdio: 'pipe',
   encoding: 'utf-8',
 };
 return execFileSync(command, args, options);
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
