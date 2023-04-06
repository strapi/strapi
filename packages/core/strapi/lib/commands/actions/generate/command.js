'use strict';

const { assertCwdContainsStrapiProject } = require('../../utils/helpers');

/**
 * `$ strapi generate`
 * @param {import('../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command, argv }) => {
  command
    .command('generate')
    .description('Launch the interactive API generator')
    .action(() => {
      assertCwdContainsStrapiProject('generate');
      argv.splice(2, 1);
      require('@strapi/generators').runCLI();
    });
};
