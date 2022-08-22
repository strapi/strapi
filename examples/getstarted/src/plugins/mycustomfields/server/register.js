'use strict';

module.exports = ({ strapi }) => {
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
