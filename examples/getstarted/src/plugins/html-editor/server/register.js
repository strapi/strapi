'use strict';

module.exports = ({ strapi }) => {
  strapi.customFields.register({
    name: 'html',
    plugin: 'html-editor',
    type: 'richtext',
    inputSize: {
      default: 12,
      isResizable: false,
    },
  });
};
