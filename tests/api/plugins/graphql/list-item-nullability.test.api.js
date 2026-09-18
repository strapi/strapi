'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const rgbColorComponent = {
  attributes: {
    name: {
      type: 'text',
    },
  },
  displayName: 'rgbColor',
};

const tagModel = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  singularName: 'tag',
  pluralName: 'tags',
  displayName: 'Tag',
  description: '',
  collectionName: '',
};

const labelModel = {
  attributes: {
    optionalColors: {
      type: 'component',
      component: 'default.rgb-color',
      repeatable: true,
    },
    requiredColors: {
      type: 'component',
      component: 'default.rgb-color',
      repeatable: true,
      required: true,
    },
    palette: {
      type: 'dynamiczone',
      components: ['default.rgb-color'],
    },
    tags: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::tag.tag',
    },
  },
  singularName: 'label',
  pluralName: 'labels',
  displayName: 'Label',
  description: '',
  collectionName: '',
};

const findField = (types, fieldName) => {
  const owner = types.find((type) => type.fields?.some((field) => field.name === fieldName));

  expect(owner).toBeDefined();

  return owner.fields.find((field) => field.name === fieldName);
};

const expectNonNullListItems = (type, { listRequired }) => {
  const listType = listRequired ? type.ofType : type;

  if (listRequired) {
    expect(type.kind).toBe('NON_NULL');
  }

  expect(listType.kind).toBe('LIST');
  expect(listType.ofType.kind).toBe('NON_NULL');
  expect(listType.ofType.ofType.kind).toMatch(/OBJECT|UNION|INTERFACE/);
};

describe('GraphQL list item nullability', () => {
  beforeAll(async () => {
    await builder.addComponent(rgbColorComponent).addContentTypes([tagModel, labelModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('generated list fields do not expose nullable entries', async () => {
    const res = await rq({
      url: '/graphql',
      method: 'POST',
      body: {
        query: /* GraphQL */ `
          query ListFieldNullability {
            __schema {
              types {
                name
                fields {
                  name
                  type {
                    kind
                    name
                    ofType {
                      kind
                      name
                      ofType {
                        kind
                        name
                        ofType {
                          kind
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const types = res.body.data.__schema.types;

    expectNonNullListItems(findField(types, 'optionalColors').type, { listRequired: false });
    expectNonNullListItems(findField(types, 'requiredColors').type, { listRequired: true });
    expectNonNullListItems(findField(types, 'palette').type, { listRequired: false });
    expectNonNullListItems(findField(types, 'tags').type, { listRequired: true });
  });
});
