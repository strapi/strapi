/**
 * Set the version from the main `package.json` into all other inner libraries.
 */

const path = require('path');

const shell = require('shelljs');
const VERSION = require(path.resolve(process.cwd(), 'package.json')).version;


shell.ls('./packages/strapi*/package.json')
  .forEach(file => {
    shell.sed('-i', /^(\s*"(version|strapi-[a-z-]*)":\s*").*(",?\s*)$/, `$1${VERSION}$3`, file);
  });
