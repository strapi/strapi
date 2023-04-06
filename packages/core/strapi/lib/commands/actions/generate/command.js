'use strict';

const { assertCwdContainsStrapiProject } = require('../../utils/helpers');

module.exports = ({ command, argv }) => {
  // $ strapi generate
  command
    .command('generate')
    .description('Launch the interactive API generator')
    .action(() => {
      assertCwdContainsStrapiProject('generate');
      argv.splice(2, 1);
      require('@strapi/generators').runCLI();
    });
};
