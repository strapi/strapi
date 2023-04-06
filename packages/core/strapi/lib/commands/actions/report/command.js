'use strict';

const { getLocalScript } = require('../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  command
    .command('report')
    .description('Get system stats for debugging and submitting issues')
    .option('-u, --uuid', 'Include Project UUID')
    .option('-d, --dependencies', 'Include Project Dependencies')
    .option('--all', 'Include All Information')
    .action(getLocalScript('report'));
};
