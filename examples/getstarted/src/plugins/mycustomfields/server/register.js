'use strict';

module.exports = ({ strapi }) => {
  console.log('Running register in customfields plugin');

  strapi.customFields.register([
    {
      name: 'color',
      plugin: 'mycustomfields',
      type: 'text',
    },
    {
      name: 'map',
      plugin: 'mycustomfields',
      type: 'json',
    },
  ]);
};
