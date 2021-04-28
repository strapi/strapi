const { generateInputModel } = require('../services/type-builder');

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
                  },
                },
              },
            },
          },
        },
      },
    };
    expect(generateInputModel(playerModel, 'player')).toMatch(
      'input PlayerInput {\nlastname: String\nfirstname: String\n}'
    );
  });
});
