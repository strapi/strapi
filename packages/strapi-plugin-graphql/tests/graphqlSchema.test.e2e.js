'use strict';

const types = require('../services/type-builder');

const playerModel = {
  attributes: {
    lastname: {
      type: 'text',
    },
    firstname: {
      type: 'text',
    },
    age: {
      type: 'integer',
    },
    level: {
      type: 'enumeration',
      enum: [
        'amateur',
        'intermediary',
        'pro'
      ],
      default: 'amateur',
    },
  },
  connection: 'default',
  name: 'player',
  description: '',
  collectionName: '',
  globalId: 'Player'
};

describe('generateInputModel', () => {
  test('removes disabled attributes', () => {
    global.strapi = {
      plugins: {
        graphql: {
          config: {
            _schema: {
              graphql: {
                type: {
                  Player: {
                    age: false,
                    level: false,
                  },
                },
              },
            },
          },
        },
      },
    };
    expect(types.generateInputModel(playerModel, 'player')).toEqual(
      `
      input PlayerInput {

        lastname: String
firstname: String
      }

      input editPlayerInput {
        
        lastname: String
firstname: String
      }
    `
    );
  });
});
