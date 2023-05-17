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
    .option('-d, --debug', `Run the generation with debug messages`, false)
    .option('-s, --silent', `Run the generation silently, without any output`, false)
    .action(getLocalScript('ts/generate-types'));
};
