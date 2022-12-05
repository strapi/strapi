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
    const upcasedType = type.charAt(0).toUpperCase() + type.slice(1);
    strapi.customFields.register({
      type,
      name: `custom${upcasedType}`,
      plugin: 'myplugin',
    });
  });

  if (strapi.plugin('graphql')) {
    require('./graphql')({ strapi });
  }
};
