import type { Core, Schema } from '@strapi/types';
import { resolveComponentUID } from '../components';

const baseContentType: Schema.ContentType = {
  collectionName: 'test',
  info: {
    singularName: 'test',
    pluralName: 'tests',
    displayName: 'Test',
  },
  attributes: {
    // To fill in the different tests
  },
  options: {
    draftAndPublish: false,
  },
  kind: 'collectionType',
  modelType: 'contentType',
  modelName: 'user',
  uid: 'api::test.test',
  globalId: 'Test',
};

describe('resolveComponentUID', () => {
  const uid = 'test.test';

  it('should return the component UID when the path matches a repeatable component', () => {
    const contentType: Schema.ContentType | Schema.Component = {
      ...baseContentType,
      attributes: {
        relsRepeatable: {
          type: 'component',
          repeatable: true,
          component: uid,
        },
      },
    };
    const strapi = {
      getModel: jest.fn().mockReturnValueOnce({
        collectionName: 'components_test_rels_repeatables',
        attributes: {
          // doesn't matter
        },
        uid,
      }),
    } as unknown as Core.Strapi;
    const paths = ['relsRepeatable', '0', 'id'];

    const data = {
      relsRepeatable: [{ id: 1, title: 'test' }],
    };

    const expectedUID = resolveComponentUID({ paths, strapi, data, contentType });

    expect(expectedUID).toEqual(uid);
  });

  it('should return the component UID when the path matches a single component', () => {
    const contentType: Schema.ContentType | Schema.Component = {
      ...baseContentType,
      attributes: {
        rels: {
          type: 'component',
          repeatable: false,
          component: uid,
        },
      },
    };
    const strapi = {
      getModel: jest.fn().mockReturnValueOnce({
        collectionName: 'components_test_rels',
        attributes: {
          // doesn't matter
        },
        uid,
      }),
    } as unknown as Core.Strapi;
    const paths = ['rels', 'id'];

    const data = {
      rels: { id: 1, title: 'test' },
    };

    const expectedUID = resolveComponentUID({ paths, strapi, data, contentType });

    expect(expectedUID).toEqual(uid);
  });

  it('should return the component UID when the path matches a dynamic zone', () => {
    const contentType: Schema.ContentType | Schema.Component = {
      ...baseContentType,
      attributes: {
        dz: {
          type: 'dynamiczone',
          components: [uid],
        },
      },
    };
    const strapi = {
      getModel: jest.fn().mockReturnValueOnce({
        collectionName: 'components_test_rels',
        attributes: {
          // doesn't matter
        },
        uid,
      }),
    } as unknown as Core.Strapi;
    const paths = ['dz', '0', 'id'];

    const data = {
      dz: [{ __component: 'test.rels', id: 1, title: 'test' }],
    };

    const expectedUID = resolveComponentUID({ paths, strapi, data, contentType });

    expect(expectedUID).toEqual(uid);
  });
});
