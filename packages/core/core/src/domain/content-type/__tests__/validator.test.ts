import { createContentType } from '../index';

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

describe('createContentType - draft and publish reserved attribute names', () => {
  beforeEach(() => {
    global.strapi = {
      log: {
        warn: jest.fn(),
      },
      config: {
        get: jest.fn().mockReturnValue(false),
      },
    } as any;
  });

  it('warns when a `status` attribute exists and draftAndPublish is enabled', () => {
    const uid = 'api::article.article';
    const data = wrap({
      ...baseSchema,
      options: { draftAndPublish: true },
      attributes: {
        status: { type: 'string' },
      },
    });

    expect(() => createContentType(uid, data)).not.toThrow();
    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    expect(strapi.log.warn).toHaveBeenCalledWith(
      expect.stringMatching(/status.*draftAndPublish|draftAndPublish.*status/i)
    );
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining(uid));
  });

  it('does not warn for a `status` attribute when draftAndPublish is disabled', () => {
    const data = wrap({
      ...baseSchema,
      options: { draftAndPublish: false },
      attributes: {
        status: { type: 'string' },
      },
    });

    expect(() => createContentType('api::article.article', data)).not.toThrow();
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  it('does not warn for non-reserved attributes when draftAndPublish is enabled', () => {
    const data = wrap({
      ...baseSchema,
      options: { draftAndPublish: true },
      attributes: {
        title: { type: 'string' },
      },
    });

    expect(() => createContentType('api::article.article', data)).not.toThrow();
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  it('matches reserved names case-insensitively via snake_case', () => {
    const data = wrap({
      ...baseSchema,
      options: { draftAndPublish: true },
      attributes: {
        Status: { type: 'string' },
      },
    });

    expect(() => createContentType('api::article.article', data)).not.toThrow();
    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
  });

  it('does not warn for always-reserved names so internal CTs (e.g. release-action.locale) keep working', () => {
    const data = wrap({
      ...baseSchema,
      options: { draftAndPublish: false },
      attributes: {
        locale: { type: 'string' },
      },
    });

    expect(() => createContentType('api::release-action.release-action', data)).not.toThrow();
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });
});
