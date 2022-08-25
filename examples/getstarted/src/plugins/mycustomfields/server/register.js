'use strict';

module.exports = ({ strapi }) => {
  strapi.customFields.register({
    name: 'color',
    plugin: 'mycustomfields',
    type: 'string',
  });
};
