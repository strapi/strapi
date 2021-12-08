'use strict';

module.exports = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      properties: {
        status: {
          type: 'integer',
        },
        name: {
          type: 'string',
        },
        message: {
          type: 'string',
        },
      },
    },
  },
};
