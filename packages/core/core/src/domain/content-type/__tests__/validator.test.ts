import { validateContentTypeDefinition } from '../validator';

const baseSchema = {
  info: {
    displayName: 'Article',
    singularName: 'article',
    pluralName: 'articles',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {} as Record<string, unknown>,
};

const wrap = (schema: typeof baseSchema) => ({
  schema,
  actions: {},
  lifecycles: {},
});

describe('validateContentTypeDefinition - reserved attribute names', () => {
  it('rejects a `status` attribute when draftAndPublish is enabled', () => {
    const data = wrap({
      ...baseSchema,
      options: { draftAndPublish: true },
      attributes: {
        status: { type: 'string' },
      },
    });

    expect(() => validateContentTypeDefinition(data)).toThrow(/reserved/);
    expect(() => validateContentTypeDefinition(data)).toThrow(/draftAndPublish/);
  });

  it('allows a `status` attribute when draftAndPublish is disabled', () => {
    const data = wrap({
      ...baseSchema,
      options: { draftAndPublish: false },
      attributes: {
        status: { type: 'string' },
      },
    });

    expect(() => validateContentTypeDefinition(data)).not.toThrow();
  });

  it('allows non-reserved attributes when draftAndPublish is enabled', () => {
    const data = wrap({
      ...baseSchema,
      options: { draftAndPublish: true },
      attributes: {
        title: { type: 'string' },
      },
    });

    expect(() => validateContentTypeDefinition(data)).not.toThrow();
  });

  it('matches reserved names case-insensitively via snake_case', () => {
    const data = wrap({
      ...baseSchema,
      options: { draftAndPublish: true },
      attributes: {
        Status: { type: 'string' },
      },
    });

    expect(() => validateContentTypeDefinition(data)).toThrow(/reserved/);
  });

  it('does not block always-reserved names so internal CTs (e.g. release-action.locale) keep working', () => {
    const data = wrap({
      ...baseSchema,
      options: { draftAndPublish: false },
      attributes: {
        locale: { type: 'string' },
      },
    });

    expect(() => validateContentTypeDefinition(data)).not.toThrow();
  });
});
