'use strict';

const cleanSchemaAttributes = require('../clean-schema-attributes');

/**
 *
 * @param {object} attributes - The attributes found on a contentType
 * @param {object} route - The current route
 *
 * @returns The Swagger requestBody
 */
module.exports = (attributes, route) => {
  const requiredAttributes = Object.entries(attributes)
    .filter(([, attribute]) => attribute.required)
    .map(([attributeName, attribute]) => {
      return { [attributeName]: attribute };
    });

  const requestAttributes =
    route.method === 'POST' && requiredAttributes.length
      ? Object.assign({}, ...requiredAttributes)
      : attributes;

  return {
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            properties: {
              data: {
                type: 'object',
                properties: cleanSchemaAttributes(requestAttributes, { isRequest: true }),
              },
            },
          },
        },
      },
    },
  };
};
