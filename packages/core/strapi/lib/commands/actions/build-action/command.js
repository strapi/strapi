'use strict';

const { loadProjectScript } = require('../../scripts/utils/helpers');

// TODO: fix gitignore so that this folder can be called build
module.exports = ({ command /* , argv */ }) => {
  // `$ strapi build`
  command
    .command('build')
    .option('--no-optimization', 'Build the admin app without optimizing assets')
    .description('Build the strapi admin app')
    .action(loadProjectScript('build'));
};
