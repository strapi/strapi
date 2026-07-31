import { excludeNotCreatableFields } from '../clone';

// Repro for https://github.com/strapi/strapi/issues/26998
// When a user cannot create nested component fields and the clone body does not
// contain the component, excludeNotCreatableFields must NOT synthesize an empty
// component object (which would overwrite the source with null values).
describe('excludeNotCreatableFields', () => {
  const fakeModels = {
    simple: {
      modelName: 'Fake simple model',
      info: { displayName: 'Simple' },
      attributes: {
        text: { type: 'string' },
      },
    },
    withComponent: {
      modelName: 'Fake model with component',
      info: { displayName: 'With component' },
      attributes: {
        title: { type: 'string' },
        metadata: {
          type: 'component',
          repeatable: false,
          component: 'simple',
        },
      },
    },
  } as any;

  beforeEach(() => {
    global.strapi = {
      getModel: jest.fn((uid) => fakeModels[uid]),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('does not synthesize a component when it is absent from the clone body', () => {
    // User can create top-level fields, but NOT the nested component field.
    const permissionChecker = {
      can: {
        create: jest.fn((_data: any, path: string) => path !== 'metadata.text'),
      },
    };

    // Body has no `metadata` — source entry did not populate the component.
    const body = { title: 'Hello' };

    const result = excludeNotCreatableFields('withComponent', permissionChecker)(body);

    // Expected: metadata stays absent so clone copies it from the source (empty stays empty).
    expect(result).not.toHaveProperty('metadata');
    expect(result).toEqual({ title: 'Hello' });
  });

  test('still nulls a restricted nested field when the component IS present', () => {
    const permissionChecker = {
      can: {
        create: jest.fn((_data: any, path: string) => path !== 'metadata.text'),
      },
    };

    const body = { title: 'Hello', metadata: { text: 'secret' } };

    const result = excludeNotCreatableFields('withComponent', permissionChecker)(body);

    // When the component exists in the body, the restricted nested field is nulled.
    expect(result).toEqual({ title: 'Hello', metadata: { text: null } });
  });
});
