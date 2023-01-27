'use strict';

const componentValidation = require('../component');

describe('Component validator', () => {
  global.strapi = {
    contentTypes: {},
    plugins: {
      'content-type-builder': {
        services: {
          builder: {
            getReservedNames() {
              return {
                models: [],
                attributes: ['thisIsReserved'],
              };
            },
          },
        },
      },
    },
  };

  describe.each(['validateComponentInput', 'validateUpdateComponentInput'])('%p', (method) => {
    test('can validate a regular component', async () => {
      const input = {
        components: [],
        component: {
          category: 'default',
          displayName: 'mycompo',
          attributes: {
            title: {
              type: 'string',
            },
          },
        },
      };

      expect.assertions(1);

      await componentValidation[method](input).then((data) => {
        expect(data).toBe(input);
      });
    });

    test('can use custom keys in attributes', async () => {
      const input = {
        components: [],
        component: {
          category: 'default',
          displayName: 'mycompo',
          attributes: {
            title: {
              type: 'string',
              myCustomKey: true,
            },
          },
        },
      };

      expect.assertions(1);

      await componentValidation[method](input).then((data) => {
        expect(data).toBe(input);
      });
    });

    test('cannot use custom keys at root', async () => {
      const input = {
        myCustomKey: true,
        components: [],
        component: {
          category: 'default',
          displayName: 'mycompo',
          attributes: {
            title: {
              type: 'string',
            },
          },
        },
      };

      expect.assertions(1);

      await expect(componentValidation[method](input)).rejects.toBeDefined();
    });
  });
});
