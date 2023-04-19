'use strict';

module.exports = ({ strapi }) => {
  strapi.customFields.register({
    name: 'color',
    plugin: 'color-picker',
    type: 'string',
    inputSize: {
      default: 4,
      isResizable: true,
    },
  });
};
