'use strict';

const { getLocalScript } = require('../../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  // `$ strapi ts:generate-types`
  command
    .command('ts:generate-types')
    .description(`Generate TypeScript typings for your schemas`)
    .option(
      '-o, --out-dir <outDir>',
      'Specify a relative directory in which the schemas definitions will be generated'
    )
    .option('-f, --file <file>', 'Specify a filename to store the schemas definitions')
    .option('--verbose', `Display more information about the types generation`, false)
    .option('-s, --silent', `Run the generation silently, without any output`, false)
    .action(getLocalScript('ts/generate-types'));
};
