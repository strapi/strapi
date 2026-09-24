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

  it('uses the target schema for every sibling relation to the same content type', () => {
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
      {
        relationTargetSchemaNames: new Map([['api::author.author', 'Author']]),
        didAddStrapiComponentsToSchemas: () => false,
      }
    );

    expect(schema.primaryAuthor).toStrictEqual({ $ref: '#/components/schemas/Author' });
    expect(schema.secondaryAuthor).toStrictEqual({ $ref: '#/components/schemas/Author' });
  });

  it('does not look up generated sibling relation targets', () => {
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
      {
        relationTargetSchemaNames: new Map([['api::author.author', 'Author']]),
        didAddStrapiComponentsToSchemas: () => false,
      }
    );

    expect(schema.primaryAuthor).toStrictEqual({ $ref: '#/components/schemas/Author' });
    expect(schema.secondaryAuthor).toStrictEqual({ $ref: '#/components/schemas/Author' });
    expect(global.strapi.contentType).not.toHaveBeenCalled();
  });

  it('uses a canonical schema reference for a fully connected relation graph', () => {
    const targets = ['api::a.a', 'api::b.b', 'api::c.c', 'api::d.d'];
    const contentType = jest.fn((uid: string) => ({
      attributes: Object.fromEntries(
        targets
          .filter((target) => target !== uid)
          .map((target) => [target, { type: 'relation', relation: 'oneToOne', target }])
      ),
    }));
    global.strapi = { contentType } as any;

    const schema = cleanSchemaAttributes(
      {
        a: { type: 'relation', relation: 'oneToOne', target: 'api::a.a' },
      } as any,
      {
        relationTargetSchemaNames: new Map(
          targets.map((target) => [target, `Schema${target.at(-1)?.toUpperCase()}`])
        ),
        didAddStrapiComponentsToSchemas: () => false,
      }
    );

    expect(schema.a).toStrictEqual({ $ref: '#/components/schemas/SchemaA' });
    expect(JSON.stringify(schema)).toBe('{"a":{"$ref":"#/components/schemas/SchemaA"}}');
    expect(contentType).not.toHaveBeenCalled();
  });

  it('uses the finite id and documentId fallback for an ungenerated relation target', () => {
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

    expect(schema.a).toStrictEqual({
      type: 'object',
      properties: {
        id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
        documentId: { type: 'string' },
      },
    });
    expect(global.strapi.contentType).not.toHaveBeenCalled();
  });

  it('uses target schemas for relations inside components and outer relations', () => {
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
      {
        relationTargetSchemaNames: new Map([['api::author.author', 'Author']]),
        didAddStrapiComponentsToSchemas: () => false,
      }
    );

    expect((schema as any).authorComponent.properties.author).toStrictEqual({
      $ref: '#/components/schemas/Author',
    });
    expect(schema.author).toStrictEqual({ $ref: '#/components/schemas/Author' });
  });

  it('does not look up an ungenerated relation target', () => {
    const contentType = jest.fn(() => {
      throw new Error('target lookup failed');
    });

    global.strapi = { contentType } as any;

    const attributes = {
      author: { type: 'relation', relation: 'oneToOne', target: 'api::author.author' },
    } as any;
    expect(
      cleanSchemaAttributes(attributes, { didAddStrapiComponentsToSchemas: () => false }).author
    ).toStrictEqual({
      type: 'object',
      properties: {
        id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
        documentId: { type: 'string' },
      },
    });
    expect(contentType).not.toHaveBeenCalled();
  });
});
