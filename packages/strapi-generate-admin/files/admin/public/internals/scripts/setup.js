#!/usr/bin/env node

var shell = require('shelljs');
var exec = require('child_process').exec;
var path = require('path');
var fs   = require('fs');
var animateProgress = require('./helpers/progress');
var addCheckMark = require('./helpers/checkmark');
var readline = require('readline');

process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdout.write('\n');
var interval = animateProgress('Cleaning old repository');
process.stdout.write('Cleaning old repository');

cleanRepo(function () {
  clearInterval(interval);
  process.stdout.write('\nInstalling dependencies... (This might take a while)');
  setTimeout(function () {
    readline.cursorTo(process.stdout, 0);
    interval = animateProgress('Installing dependencies');
  }, 500);

  process.stdout.write('Installing dependencies');
  installDeps(function (error) {
    clearInterval(interval);
    if (error) {
      process.stdout.write(error);
    }

    deleteFileInCurrentDir('setup.js', function () {
      process.stdout.write('\n');
      interval = animateProgress('Initialising new repository');
      process.stdout.write('Initialising new repository');
      initGit(function () {
        clearInterval(interval);
        process.stdout.write('\nDone!');
        process.exit(0);
      });
    });
  });
});

/**
 * Deletes the .git folder in dir
 */
function cleanRepo(callback) {
  shell.rm('-rf', '.git/');
  addCheckMark(callback);
}

/**
 * Initializes git again
 */
function initGit(callback) {
  exec('git init && git add . && git commit -m "Initial commit"', addCheckMark.bind(null, callback));
}

/**
 * Deletes a file in the current directory
 */
function deleteFileInCurrentDir(file, callback) {
  fs.unlink(path.join(__dirname, file), callback);
}

/**
 * Installs dependencies
 */
function installDeps(callback) {
  exec('npm install', addCheckMark.bind(null, callback));
}
