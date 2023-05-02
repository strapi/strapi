'use strict';

module.exports = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
  schemas: {
    Error: {
      type: 'object',
      required: ['error'],
      properties: {
        data: {
          nullable: true,
          oneOf: [{ type: 'object' }, { type: 'array', items: { type: 'object' } }],
        },
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
            details: {
              type: 'object',
            },
          },
        },
      },
    },
  },
};
