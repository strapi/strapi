import { bench, describe } from 'vitest';

import { createAPISanitizers } from '../sanitize';
import { createAPIValidators } from '../validate';
import { articleModel, complexQuery, getModel, makeArticle, setupStrapiGlobal } from './fixtures';

setupStrapiGlobal();

const sanitizers = createAPISanitizers({ getModel });
const validators = createAPIValidators({ getModel });

const singleEntity = makeArticle(1);
const entities = Array.from({ length: 50 }, (_, index) => makeArticle(index));

const input = {
  id: 10,
  documentId: 'doc-10',
  title: 'New article',
  content: 'Some content',
  views: 3,
  author: 1,
  seo: { metaTitle: 'Seo', metaDescription: 'Desc' },
  blocks: [{ __component: 'shared.quote', body: 'Quote', author: 'Someone' }],
  createdBy: 1,
  updatedBy: 1,
};

describe('sanitize', () => {
  bench('sanitize.output - single entity', async () => {
    await sanitizers.output(singleEntity, articleModel);
  });

  bench('sanitize.output - 50 entities', async () => {
    await sanitizers.output(entities, articleModel);
  });

  bench('sanitize.input - entity with components', async () => {
    await sanitizers.input(input, articleModel);
  });

  bench('sanitize.query - complex query', async () => {
    await sanitizers.query(complexQuery, articleModel);
  });
});

describe('validate', () => {
  bench('validate.query - complex query', async () => {
    await validators.query(complexQuery, articleModel);
  });

  bench('validate.input - entity with components', async () => {
    await validators.input(
      { title: 'New article', content: 'Some content', seo: { metaTitle: 'Seo' } },
      articleModel
    );
  });
});
