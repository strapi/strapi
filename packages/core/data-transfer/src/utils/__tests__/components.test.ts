import type { Core, Schema } from '@strapi/types';
import { collectComponentIdMappings, resolveComponentUID } from '../components';

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

describe('collectComponentIdMappings', () => {
  const componentUID = 'test.comp';
  const nestedComponentUID = 'test.nested';
  const otherComponentUID = 'test.other';

  const componentSchemas: Record<string, unknown> = {
    [componentUID]: {
      uid: componentUID,
      modelType: 'component',
      attributes: {
        title: { type: 'string' },
        nested: { type: 'component', repeatable: false, component: nestedComponentUID },
      },
    },
    [nestedComponentUID]: {
      uid: nestedComponentUID,
      modelType: 'component',
      attributes: {
        name: { type: 'string' },
      },
    },
    [otherComponentUID]: {
      uid: otherComponentUID,
      modelType: 'component',
      attributes: {
        label: { type: 'string' },
      },
    },
  };

  const strapi = {
    getModel: jest.fn((uid: string) => componentSchemas[uid]),
  } as unknown as Core.Strapi;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should collect the couple for a single component with a changed ID', () => {
    const schema: Schema.ContentType = {
      ...baseContentType,
      attributes: {
        comp: { type: 'component', repeatable: false, component: componentUID },
      },
    };

    const data = { title: 'entry', comp: { id: 4, title: 'old' } };
    const created = { id: 1, comp: { id: 12 } };

    const mappings = collectComponentIdMappings({ data, created, schema, strapi });

    expect(mappings).toEqual([{ uid: componentUID, oldID: 4, newID: 12 }]);
  });

  it('should collect the couple even when the component ID did not change', () => {
    const schema: Schema.ContentType = {
      ...baseContentType,
      attributes: {
        comp: { type: 'component', repeatable: false, component: componentUID },
      },
    };

    const data = { comp: { id: 7, title: 'same' } };
    const created = { id: 1, comp: { id: 7 } };

    const mappings = collectComponentIdMappings({ data, created, schema, strapi });

    expect(mappings).toEqual([{ uid: componentUID, oldID: 7, newID: 7 }]);
  });

  it('should pair repeatable components by index', () => {
    const schema: Schema.ContentType = {
      ...baseContentType,
      attributes: {
        comps: { type: 'component', repeatable: true, component: componentUID },
      },
    };

    const data = {
      comps: [
        { id: 1, title: 'first' },
        { id: 2, title: 'second' },
      ],
    };
    const created = { id: 1, comps: [{ id: 10 }, { id: 11 }] };

    const mappings = collectComponentIdMappings({ data, created, schema, strapi });

    expect(mappings).toEqual([
      { uid: componentUID, oldID: 1, newID: 10 },
      { uid: componentUID, oldID: 2, newID: 11 },
    ]);
  });

  it('should collect nested component couples', () => {
    const schema: Schema.ContentType = {
      ...baseContentType,
      attributes: {
        comp: { type: 'component', repeatable: false, component: componentUID },
      },
    };

    const data = { comp: { id: 4, title: 'old', nested: { id: 8, name: 'deep' } } };
    const created = { id: 1, comp: { id: 12, nested: { id: 25 } } };

    const mappings = collectComponentIdMappings({ data, created, schema, strapi });

    expect(mappings).toEqual([
      { uid: componentUID, oldID: 4, newID: 12 },
      { uid: nestedComponentUID, oldID: 8, newID: 25 },
    ]);
  });

  it('should resolve dynamic zone components from the __component of each item', () => {
    const schema: Schema.ContentType = {
      ...baseContentType,
      attributes: {
        dz: { type: 'dynamiczone', components: [componentUID, otherComponentUID] },
      },
    };

    const data = {
      dz: [
        { __component: componentUID, id: 3, title: 'a' },
        { __component: otherComponentUID, id: 5, label: 'b' },
      ],
    };
    const created = {
      id: 1,
      dz: [
        { __component: componentUID, id: 30 },
        { __component: otherComponentUID, id: 50 },
      ],
    };

    const mappings = collectComponentIdMappings({ data, created, schema, strapi });

    expect(mappings).toEqual([
      { uid: componentUID, oldID: 3, newID: 30 },
      { uid: otherComponentUID, oldID: 5, newID: 50 },
    ]);
  });

  it('should skip dynamic zone items whose components do not match', () => {
    const schema: Schema.ContentType = {
      ...baseContentType,
      attributes: {
        dz: { type: 'dynamiczone', components: [componentUID, otherComponentUID] },
      },
    };

    const data = { dz: [{ __component: componentUID, id: 3 }] };
    const created = { id: 1, dz: [{ __component: otherComponentUID, id: 30 }] };

    const mappings = collectComponentIdMappings({ data, created, schema, strapi });

    expect(mappings).toEqual([]);
  });

  it('should ignore component values missing from either side', () => {
    const schema: Schema.ContentType = {
      ...baseContentType,
      attributes: {
        comp: { type: 'component', repeatable: false, component: componentUID },
        otherComp: { type: 'component', repeatable: false, component: otherComponentUID },
      },
    };

    const data = { comp: { id: 4, title: 'old' }, otherComp: null };
    const created = { id: 1, otherComp: { id: 2 } };

    const mappings = collectComponentIdMappings({ data, created, schema, strapi });

    expect(mappings).toEqual([]);
  });
});
