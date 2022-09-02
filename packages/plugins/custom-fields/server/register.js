'use strict';

module.exports = ({ strapi }) => {
  strapi.customFields.register({
    name: 'color-picker',
    plugin: 'custom-fields',
    type: 'string',
  });
};
