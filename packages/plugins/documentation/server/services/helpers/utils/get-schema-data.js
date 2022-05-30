'use strict';

/**
 * @description Determines the format of the data response
 * 
 * @param {boolean} isListOfEntities - Checks for a multiple entities
 * @param {object} attributes - The attributes found on a contentType
 
 * @returns object | array of attributes
 */
module.exports = (isListOfEntities, attributes) => {
  if (isListOfEntities) {
    return {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          attributes: { type: 'object', properties: attributes },
        },
      },
    };
  }

  return {
    type: 'object',
    properties: {
      id: { type: 'string' },
      attributes: { type: 'object', properties: attributes },
    },
  };
};
