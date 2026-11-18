import * as builder from '../../../services/builder';
import { validateComponentInput, validateUpdateComponentInput } from '../component';

const componentValidation = {
  validateComponentInput,
  validateUpdateComponentInput,
} as const;

describe('Component validator', () => {
  global.strapi = {
    contentTypes: {},
    plugins: {
      'content-type-builder': {
        services: {
          builder,
        },
      },
    },
  } as any;

  describe.each([
    'validateComponentInput',
    'validateUpdateComponentInput',
  ] as (keyof typeof componentValidation)[])('%p', (method) => {
    test('can validate a regular component', async () => {
      const input = {
        components: [],
        component: {
          category: 'default',
          displayName: 'mycompo',
          icon: 'calendar',
          attributes: {
            title: {
              type: 'string',
            },
          },
        },
      } as any; // TODO TS: use yup.schemaOf

      expect.assertions(1);

      await componentValidation[method](input).then((data: any) => {
        expect(data).toBe(input);
      });
    });

    // A null attribute made the yup.lazy callback throw where nothing awaited it, so the
    // validation never settled. The timeout fails the test instead of hanging.
    test.each([
      ['a null attribute', { foo: null }],
      ['an array with a null attribute', [null]],
    ])(
      'rejects %s',
      async (_label, attributes) => {
        const input = {
          component: {
            category: 'default',
            displayName: 'mycompo',
            icon: 'calendar',
            attributes,
          },
        } as any;

        await expect(componentValidation[method](input)).rejects.toMatchObject({
          name: 'ValidationError',
        });
      },
      2000
    );

    test('rejects a null attribute in a nested component', async () => {
      const input = {
        component: {
          category: 'default',
          displayName: 'mycompo',
          icon: 'calendar',
          attributes: { title: { type: 'string' } },
        },
        components: [
          {
            uid: 'default.nested',
            category: 'default',
            displayName: 'nested',
            icon: 'calendar',
            attributes: { foo: null },
          },
        ],
      } as any;

      await expect(componentValidation[method](input)).rejects.toMatchObject({
        name: 'ValidationError',
      });
    }, 2000);

    test('can use custom keys in attributes', async () => {
      const input = {
        components: [],
        component: {
          category: 'default',
          displayName: 'mycompo',
          icon: 'calendar',
          attributes: {
            title: {
              type: 'string',
              myCustomKey: true,
            },
          },
        },
      } as any; // TODO TS: use yup.schemaOf

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
          icon: 'calendar',
          attributes: {
            title: {
              type: 'string',
            },
          },
        },
      } as any; // TODO TS: use yup.schemaOf

      expect.assertions(1);

      await expect(componentValidation[method](input)).rejects.toBeDefined();
    });
  });
});
