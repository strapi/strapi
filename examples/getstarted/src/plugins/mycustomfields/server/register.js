'use strict';

module.exports = ({ strapi }) => {
  console.log('Running register in customfields plugin');

  strapi.customFields.register([
    {
      name: 'color',
      plugin: 'mycustomfields',
      type: 'string',
    },
    {
      name: 'map',
      plugin: 'mycustomfields',
      type: 'json',
    },
  ]);
};
