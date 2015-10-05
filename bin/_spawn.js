#!/usr/bin/env node

var spawn = require('child_process').spawn;
var args = [ __dirname + '/strapi.js' ].concat(process.argv.slice(2));

spawn(process.argv[0], ['--harmony'].concat(args), {
  stdio: [0, 1, 2]
});
