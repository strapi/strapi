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

    test('rejects a component in its loaded schema form', async () => {
      // The keys a loaded component schema adds to the input: `info` instead of the top-level
      // `displayName` and `icon`, and the model identity.
      const input = {
        component: {
          category: 'default',
          displayName: 'mycompo',
          attributes: { title: { type: 'string' } },
          info: { displayName: 'mycompo' },
          uid: 'default.mycompo',
          modelType: 'component',
          modelName: 'mycompo',
          globalId: 'ComponentDefaultMycompo',
        },
      } as any;

      await expect(componentValidation[method](input)).rejects.toMatchObject({
        name: 'ValidationError',
      });
    });
  });
});
