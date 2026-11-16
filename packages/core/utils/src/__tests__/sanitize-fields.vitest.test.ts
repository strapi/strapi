/**
 * `fields` sanitization runs several steps over the list. A step that drops an entry must not
 * stop the following steps from checking the entries that are left.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAPISanitizers } from '../sanitize';
import { chain, chainLeafPath, createStrapiGlobal, getModel } from './populate-walk.testdata';

const sanitizers = createAPISanitizers({ getModel });
const article = getModel('api::article.article');
const author = getModel('api::author.author');

describe('fields sanitization', () => {
  const originalStrapi = global.strapi;

  beforeEach(() => {
    global.strapi = createStrapiGlobal();
  });

  afterEach(() => {
    global.strapi = originalStrapi;
  });

  it.each([
    ['a list', ['title', 'internalCode', 'author', 'notAnAttribute'], article, ['title']],
    ['a comma-separated string', 'title,internalCode,author', article, ['title']],
    ['a list with schema option attributes', ['name', 'internalRef', 'articles'], author, ['name']],
    ['a list with a password', ['name', 'password', 'avatar'], author, ['name']],
  ])(
    'applies every step to %s that also has relation or unknown entries',
    async (_name, fields, schema, expected) => {
      expect(await sanitizers.fields(fields, schema)).toEqual(expected);
    }
  );

  it('keeps the remaining entries in their order', async () => {
    expect(
      await sanitizers.fields(['slug', 'author', 'title', 'internalCode', 'documentId'], article)
    ).toEqual(['slug', 'title', 'documentId']);
  });

  it('leaves a list that needs no change as it is', async () => {
    expect(await sanitizers.fields(['title', 'slug'], article)).toEqual(['title', 'slug']);
    expect(await sanitizers.fields('*', article)).toBe('*');
  });

  it.each([1, 3, 5])('applies every step to a list at depth %i of a populate', async (depth) => {
    const sanitized = await sanitizers.populate(
      { categories: chain(depth, { fields: ['title', 'internalCode', 'author'] }) },
      article
    );

    expect(sanitized).toHaveProperty([...chainLeafPath(depth), 'fields'], ['title']);
  });
});
