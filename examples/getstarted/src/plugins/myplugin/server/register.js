'use strict';

module.exports = ({ strapi }) => {
  const allTypes = [
    'biginteger',
    'boolean',
    'date',
    'datetime',
    'decimal',
    'email',
    'enumeration',
    'float',
    'integer',
    'json',
    'password',
    'richtext',
    'string',
    'text',
    'time',
    'uid',
  ];

  allTypes.forEach((type) => {
    strapi.customFields.register({
      type,
      name: `custom${type}`,
      plugin: 'myplugin',
    });
  });

  if (strapi.plugin('graphql')) {
    require('./graphql')({ strapi });
  }
};
