'use strict';

const { getRelationalFields } = require('../relations');

describe('Relations', () => {
  describe('getRelationalFields', () => {
    test('Attribute must have a type relation', () => {
      getRelationalFields({
        attributes: {
          rel: {
            type: 'realtion',
          },
          title: {
            type: 'string',
          },
        },
      }).toEqual('rel');
    });
  });
});
