import type { BuilderResources } from '../../../../utils/builder-helper';

const articleSchema = {
  kind: 'collectionType',
  collectionName: 'articles',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  draftAndPublish: true,
  attributes: {
    title: {
      type: 'string',
    },
  },
};

const resources: BuilderResources = {
  schemas: {
    'content-types': {
      'api::article.article': articleSchema,
    },
    components: {},
  },
  fixtures: {
    'content-types': {
      'api::article.article': [
        {
          documentId: 'Article1',
          title: 'Article1-Draft-EN',
          publishedAt: null,
        },
        {
          documentId: 'Article2',
          title: 'Article2-Draft-EN',
          publishedAt: null,
        },
      ],
    },
  },
};

export default resources;
