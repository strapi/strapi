import * as z from 'zod/v4';
import { createAPISanitizers } from '../sanitize';
import { ValidationError } from '../errors';
import { articleModel, getModel } from './test-fixtures';

describe('sanitizeQuery', () => {
  const sanitizers = createAPISanitizers({ getModel });
  const schema = articleModel;

  beforeEach(() => {
    global.strapi = {
      contentTypes: {
        'api::allowed.allowed': {
          uid: 'api::allowed.allowed',
          attributes: {
            related: {
              type: 'relation',
              relation: 'morphOne',
              target: 'api::article.article',
              morphBy: 'related',
            },
          },
        },
        'admin::user': {
          uid: 'admin::user',
          attributes: {
            related: {
              type: 'relation',
              relation: 'morphOne',
              target: 'api::article.article',
              morphBy: 'related',
            },
          },
        },
        'api::other.other': {
          uid: 'api::other.other',
          attributes: {
            related: {
              type: 'relation',
              relation: 'morphOne',
              target: 'api::article.article',
              morphBy: 'unrelated',
            },
          },
        },
        'plugin::upload.file': {
          uid: 'plugin::upload.file',
          attributes: {},
        },
      },
      components: {},
      auth: {
        verify(_auth: unknown, { scope }: { scope: string }) {
          if (scope === 'admin::user.find') {
            throw new Error('Unauthorized');
          }

          return true;
        },
      },
    } as any;
  });

  /**
   * When strictParams is true, only allowed query keys (and extra keys from route.request.query) are kept.
   * Extra params are sanitized via Zod safeParse; invalid values are omitted.
   */
  describe('strictParams option', () => {
    it('strips unrecognized keys when strictParams: true', async () => {
      const query = { filters: { id: 1 }, where: { id: 1 } };
      const result = await sanitizers.query(query, schema, { strictParams: true });
      expect(result).not.toHaveProperty('where');
      expect(result).toHaveProperty('filters');
    });

    it('keeps unrecognized keys when strictParams: false', async () => {
      const query = { filters: { id: 1 }, where: { id: 1 } };
      const result = await sanitizers.query(query, schema, { strictParams: false });
      expect(result).toHaveProperty('where');
    });

    it('keeps extra param from route when strictParams: true and Zod parses successfully', async () => {
      const route = {
        request: {
          query: { search: z.string().transform((s) => s.trim()) },
        },
      };
      const query = { filters: { id: 1 }, search: '  foo  ' };
      const result = await sanitizers.query(query, schema, {
        strictParams: true,
        route,
      });
      expect(result).toHaveProperty('search', 'foo');
      expect(result).toHaveProperty('filters');
    });

    it('omits extra param from result when Zod safeParse fails (invalid value)', async () => {
      const route = {
        request: {
          query: { search: z.string().min(1) },
        },
      };
      const query = { filters: { id: 1 }, search: '' };
      const result = await sanitizers.query(query, schema, {
        strictParams: true,
        route,
      });
      expect(result).not.toHaveProperty('search');
      expect(result).toHaveProperty('filters');
    });

    it('sanitizes extra query param that is array of scalars (e.g. tags)', async () => {
      const route = {
        request: {
          query: { tags: z.array(z.string()).transform((arr) => arr.map((s) => s.trim())) },
        },
      };
      const query = { filters: { id: 1 }, tags: ['  a  ', '  b  '] };
      const result = await sanitizers.query(query, schema, {
        strictParams: true,
        route,
      });
      expect(result).toHaveProperty('tags', ['a', 'b']);
    });
  });

  describe('publicationFilter (core query param)', () => {
    it('throws ValidationError with details when publicationFilter is invalid', async () => {
      const query = { filters: { id: 1 }, publicationFilter: 'invalid-mode' };

      try {
        await sanitizers.query(query, schema, { strictParams: false });
        expect.fail('expected throw');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ValidationError);
        expect(e.details?.source).toBe('query');
        expect(e.details?.param).toBe('publicationFilter');
      }
    });

    it('passes through valid publicationFilter', async () => {
      const query = { filters: { id: 1 }, publicationFilter: 'modified' };
      const result = await sanitizers.query(query, schema, { strictParams: false });
      expect(result).toMatchObject({ publicationFilter: 'modified' });
    });
  });

  it('removes invalid nested scalar filter keys next to operators', async () => {
    const query = {
      filters: {
        title: {
          $containsi: 'foo',
          __invalidNestedFilterKey: 'should-be-removed',
        },
      },
    };

    const result = await sanitizers.query(query, schema);

    expect(result).toMatchObject({
      filters: {
        title: {
          $containsi: 'foo',
        },
      },
    });
    expect((result as any).filters.title).not.toHaveProperty('__invalidNestedFilterKey');
  });

  describe('sort', () => {
    it.each([
      ['empty array (GraphQL default)', []],
      ['empty string', ''],
      ['comma-only string', ','],
      ['empty object', {}],
      ['array of empty strings', ['']],
      ['array with null (qs sort[])', [null]],
    ])('removes meaningless sort: %s', async (_label, sort) => {
      const result = await sanitizers.query({ sort, filters: { id: 1 } }, schema);

      expect(result).not.toHaveProperty('sort');
      expect(result).toHaveProperty('filters');
    });

    it('keeps meaningful sort', async () => {
      const result = await sanitizers.query({ sort: 'title:asc', filters: { id: 1 } }, schema);

      expect(result).toHaveProperty('sort', 'title:asc');
    });
  });

  it('passes auth to populate sanitization', async () => {
    const result = await sanitizers.query(
      {
        populate: {
          createdBy: true,
        },
      },
      schema,
      { auth: {} }
    );

    expect(result).toEqual({ populate: {} });
  });

  it('sanitizes morph populate fragments with auth', async () => {
    const morphSchema = {
      ...schema,
      attributes: {
        ...schema.attributes,
        related: {
          type: 'relation' as const,
          relation: 'morphToOne' as const,
        },
      },
    };

    const result = await sanitizers.query(
      {
        populate: {
          related: {
            on: {
              'admin::user': true,
              'api::article.article': true,
            },
          },
        },
      },
      morphSchema,
      { auth: {} }
    );

    expect(result).toEqual({
      populate: {
        related: {
          on: {
            'api::article.article': true,
          },
        },
      },
    });
  });

  it('preserves explicit morph count populate fragments while filtering unauthorized UIDs', async () => {
    const morphSchema = {
      ...schema,
      attributes: {
        ...schema.attributes,
        related: {
          type: 'relation' as const,
          relation: 'morphToOne' as const,
        },
      },
    };

    const result = await sanitizers.query(
      {
        populate: {
          related: {
            count: true,
            on: {
              'admin::user': true,
              'api::article.article': true,
            },
          },
        },
      },
      morphSchema,
      { auth: {} }
    );

    expect(result).toEqual({
      populate: {
        related: {
          count: true,
          on: {
            'api::article.article': true,
          },
        },
      },
    });
  });

  it('normalizes explicit morph count string fragments while filtering unauthorized UIDs', async () => {
    const morphSchema = {
      ...schema,
      attributes: {
        ...schema.attributes,
        related: {
          type: 'relation' as const,
          relation: 'morphToOne' as const,
        },
      },
    };

    const result = await sanitizers.query(
      {
        populate: {
          related: {
            count: 'true',
            on: {
              'admin::user': true,
              'api::article.article': true,
            },
          },
        },
      },
      morphSchema,
      { auth: {} }
    );

    expect(result).toEqual({
      populate: {
        related: {
          count: true,
          on: {
            'api::article.article': true,
          },
        },
      },
    });
  });

  it.each([
    ['morphToOne boolean populate', 'morphToOne', true, { on: { 'api::allowed.allowed': true } }],
    ['morphToMany boolean populate', 'morphToMany', true, { on: { 'api::allowed.allowed': true } }],
    [
      'morphToOne boolean string populate',
      'morphToOne',
      'true',
      { on: { 'api::allowed.allowed': true } },
    ],
    [
      'morphToMany boolean string populate',
      'morphToMany',
      'true',
      { on: { 'api::allowed.allowed': true } },
    ],
    [
      'morphToOne count populate',
      'morphToOne',
      { count: true },
      { count: true, on: { 'api::allowed.allowed': true } },
    ],
    [
      'morphToMany count populate',
      'morphToMany',
      { count: true },
      { count: true, on: { 'api::allowed.allowed': true } },
    ],
    [
      'morphToOne count string populate',
      'morphToOne',
      { count: 'true' },
      { count: true, on: { 'api::allowed.allowed': true } },
    ],
    [
      'morphToMany count string populate',
      'morphToMany',
      { count: 'true' },
      { count: true, on: { 'api::allowed.allowed': true } },
    ],
  ])(
    'rewrites morph %s into authorized on fragments for every findable content type',
    async (_label, relation, populateValue, expected) => {
      const morphSchema = {
        ...schema,
        attributes: {
          ...schema.attributes,
          related: {
            type: 'relation' as const,
            relation,
          },
        },
      };

      const result = await sanitizers.query(
        {
          populate: {
            related: populateValue,
          },
        },
        morphSchema,
        { auth: {} }
      );

      expect(result).toEqual({
        populate: {
          related: {
            ...expected,
            on: {
              'api::allowed.allowed': true,
              'api::other.other': true,
              'plugin::upload.file': true,
            },
          },
        },
      });
    }
  );

  it('removes morph populate when no configured target UID is authorized', async () => {
    const morphSchema = {
      ...schema,
      attributes: {
        ...schema.attributes,
        deniedRelated: {
          type: 'relation' as const,
          relation: 'morphToOne' as const,
        },
      },
    };

    global.strapi.contentTypes = {
      'admin::user': {
        uid: 'admin::user',
        attributes: {
          deniedRelated: {
            type: 'relation',
            relation: 'morphOne',
            target: 'api::article.article',
            morphBy: 'deniedRelated',
          },
        },
      },
    };

    const result = await sanitizers.query(
      {
        populate: {
          deniedRelated: true,
        },
      },
      morphSchema,
      { auth: {} }
    );

    expect(result).toEqual({ populate: {} });
  });
});
