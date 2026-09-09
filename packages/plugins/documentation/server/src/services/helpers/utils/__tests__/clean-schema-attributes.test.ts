import cleanSchemaAttributes from '../clean-schema-attributes';

describe('Documentation plugin | clean schema attributes', () => {
  beforeEach(() => {
    global.strapi = {
      contentType: jest.fn((uid) => {
        if (uid === 'api::author.author') {
          return {
            attributes: {
              name: { type: 'string' },
            },
          };
        }

        return { attributes: {} };
      }),
    } as any;
  });

  afterEach(() => {
    global.strapi = {} as any;
  });

  it('includes target properties for every sibling relation to the same content type', () => {
    const schema = cleanSchemaAttributes(
      {
        primaryAuthor: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::author.author',
        },
        secondaryAuthor: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::author.author',
        },
      } as any,
      { didAddStrapiComponentsToSchemas: () => false }
    );

    expect(schema.primaryAuthor).toMatchObject({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    });
    expect(schema.secondaryAuthor).toMatchObject({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    });
  });

  it('terminates genuine relation cycles with the id and documentId fallback', () => {
    global.strapi = {
      contentType: jest.fn((uid) => {
        if (uid === 'api::a.a') {
          return {
            attributes: {
              name: { type: 'string' },
              b: { type: 'relation', relation: 'oneToOne', target: 'api::b.b' },
            },
          };
        }

        return {
          attributes: {
            title: { type: 'string' },
            a: { type: 'relation', relation: 'oneToOne', target: 'api::a.a' },
          },
        };
      }),
    } as any;

    const schema = cleanSchemaAttributes(
      {
        a: { type: 'relation', relation: 'oneToOne', target: 'api::a.a' },
      } as any,
      { didAddStrapiComponentsToSchemas: () => false }
    );

    const recursiveA = (schema as any).a.properties.b.properties.a;

    expect(recursiveA).toMatchObject({
      type: 'object',
      properties: {
        id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
        documentId: { type: 'string' },
      },
    });
    expect(Object.keys(recursiveA.properties)).toEqual(['id', 'documentId']);
  });

  it('does not retain a target visited inside a component for a later outer relation', () => {
    global.strapi = {
      components: {
        'shared.author': {
          attributes: {
            author: {
              type: 'relation',
              relation: 'oneToOne',
              target: 'api::author.author',
            },
          },
        },
      },
      contentType: jest.fn(() => ({
        attributes: {
          name: { type: 'string' },
        },
      })),
    } as any;

    const schema = cleanSchemaAttributes(
      {
        authorComponent: { type: 'component', component: 'shared.author', repeatable: false },
        author: { type: 'relation', relation: 'oneToOne', target: 'api::author.author' },
      } as any,
      { didAddStrapiComponentsToSchemas: () => false }
    );

    expect((schema as any).authorComponent.properties.author).toMatchObject({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    });
    expect(schema.author).toMatchObject({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    });
  });

  it('cleans up traversal state when resolving a target throws', () => {
    const typeMap = new Map<string, boolean>();
    const contentType = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('target lookup failed');
      })
      .mockImplementation(() => ({
        attributes: {
          name: { type: 'string' },
        },
      }));

    global.strapi = { contentType } as any;

    const attributes = {
      author: { type: 'relation', relation: 'oneToOne', target: 'api::author.author' },
    } as any;
    const options = { typeMap, didAddStrapiComponentsToSchemas: () => false };

    expect(() => cleanSchemaAttributes(attributes, options)).toThrow('target lookup failed');
    expect(typeMap.has('api::author.author')).toBe(false);

    expect(cleanSchemaAttributes(attributes, options).author).toMatchObject({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    });
  });
});
