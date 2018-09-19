/**
 * Set all `strapi-*` dependencies as local
 */

const shell = require('shelljs');

shell.ls('./packages/strapi*/package.json')
  .forEach(file => {
    shell.sed('-i', /^(\s*"(strapi-[a-z-]*)":\s*").*(",?\s*)$/, '$1file:../$2$3', file);
  });
