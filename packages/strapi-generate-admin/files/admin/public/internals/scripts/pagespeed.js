#!/usr/bin/env node

process.stdin.resume();
process.stdin.setEncoding('utf8');

var ngrok = require('ngrok');
var psi = require('psi');
var chalk = require('chalk');

log('\nStarting ngrok tunnel');

startTunnel(runPsi);

function runPsi(url) {
  log('\nStarting PageSpeed Insights');
  psi.output(url).then(function (err) {
    process.exit(0);
  });
}

function startTunnel(cb) {
  ngrok.connect(3000, function (err, url) {
    if (err) {
      log(chalk.red('\nERROR\n' + err));
      process.exit(0);
    }

    log('\nServing tunnel from: ' + chalk.magenta(url));
    cb(url);
  });
}

function log(string) {
  process.stdout.write(string);
}
