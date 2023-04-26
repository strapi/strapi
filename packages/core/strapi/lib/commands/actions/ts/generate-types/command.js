'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi ts:generate-types`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
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
