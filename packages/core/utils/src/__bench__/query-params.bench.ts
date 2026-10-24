import { bench, describe } from 'vitest';

import { createTransformer } from '../convert-query-params';
import { articleModel, complexQuery, getModel } from './fixtures';

const transformer = createTransformer({ getModel });

describe('convert-query-params', () => {
  bench('transformQueryParams - simple', () => {
    transformer.transformQueryParams('api::article.article', {
      filters: { title: 'Hello' },
      sort: 'title:asc',
      page: 1,
      pageSize: 10,
    });
  });

  bench('transformQueryParams - complex', () => {
    transformer.transformQueryParams('api::article.article', complexQuery as any);
  });

  bench('convertFiltersQueryParams - nested logical operators', () => {
    transformer.private_convertFiltersQueryParams(complexQuery.filters as any, articleModel);
  });

  bench('convertPopulateQueryParams - nested populate with dynamic zone', () => {
    transformer.private_convertPopulateQueryParams(complexQuery.populate as any, articleModel);
  });

  bench('convertSortQueryParams - string array', () => {
    transformer.private_convertSortQueryParams(['title:asc', 'createdAt:desc', 'author.name:asc']);
  });

  bench('convertSortQueryParams - nested objects', () => {
    transformer.private_convertSortQueryParams([
      { createdAt: 'desc' },
      { author: { name: 'asc' } },
      { seo: { metaTitle: 'asc' } },
    ]);
  });
});
