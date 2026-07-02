/**
 * Lightweight article + category schemas for document-service API tests.
 *
 * Avoids the heavyweight shared resources (4 content types, 5 components, 3 extra
 * locales) which cause slow setup/teardown due to multiple Strapi restarts per
 * schema deletion during builder.cleanup().
 */
import type { BuilderResources } from '../../../utils/builder-helper';

import categorySchema from './schemas/category';
import compSchema from './schemas/comp';
import dzCompSchema from './schemas/dz-comp';

export const ARTICLE_UID = 'api::article.article' as const;
export const CATEGORY_UID = 'api::category.category' as const;
export const AUTHOR_UID = 'api::author.author' as const;

const authorSchema = {
  kind: 'collectionType' as const,
  collectionName: 'authors',
  singularName: 'author',
  pluralName: 'authors',
  displayName: 'Author',
  description: '',
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: false,
    },
  },
  attributes: {
    name: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
  },
};

const minimalCategorySchema = {
  ...categorySchema,
  attributes: {
    name: categorySchema.attributes.name,
  },
};

const articleWithCategoriesSchema = {
  kind: 'collectionType' as const,
  collectionName: 'articles',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  description: '',
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    categories: {
      type: 'relation',
      relation: 'manyToMany',
      target: CATEGORY_UID,
    },
  },
};

const articleWithComponentsSchema = {
  kind: 'collectionType' as const,
  collectionName: 'articles',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  description: '',
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    comp: {
      type: 'component',
      repeatable: false,
      component: 'article.comp',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    dz: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'dynamiczone',
      components: ['article.dz-comp'],
    },
  },
};

const articleWithComponentsSchemaWithCategories = {
  ...articleWithComponentsSchema,
  attributes: {
    ...articleWithComponentsSchema.attributes,
    categories: {
      type: 'relation',
      relation: 'manyToMany',
      target: CATEGORY_UID,
    },
  },
};

const categoryFixtures = [
  {
    documentId: 'Cat1',
    name: 'Cat1-EN',
    publishedAt: null,
    locale: 'en',
    createdBy: 1,
    updatedBy: 1,
  },
  {
    documentId: 'Cat1',
    name: 'Cat1-NL',
    publishedAt: null,
    locale: 'nl',
    createdBy: 1,
    updatedBy: 1,
  },
  {
    documentId: 'Cat2',
    name: 'Cat2-EN',
    publishedAt: null,
    locale: 'en',
    createdBy: 1,
    updatedBy: 1,
  },
];

const deleteArticleFixtures = (fixtures: { category: typeof categoryFixtures }) => {
  const category = (name: string) => {
    const categoryID = fixtures.category.find((cat) => cat.name === name)?.id;

    if (!categoryID) {
      throw new Error(`Invalid fixture category '${name}': not found`);
    }

    return categoryID;
  };

  return [
    {
      documentId: 'Article1',
      title: 'Article1-Draft-EN',
      publishedAt: null,
      locale: 'en',
      categories: [category('Cat1-EN')],
      createdBy: 1,
      updatedBy: 1,
    },
    {
      documentId: 'Article2',
      title: 'Article2-Draft-EN',
      publishedAt: null,
      locale: 'en',
      categories: [],
      createdBy: 1,
      updatedBy: 1,
    },
    {
      documentId: 'Article1',
      title: 'Article1-Draft-NL',
      publishedAt: null,
      locale: 'nl',
      categories: [category('Cat1-NL')],
      createdBy: 1,
      updatedBy: 1,
    },
  ];
};

type MinimalArticleCategoryOptions = {
  withComponents?: boolean;
  withAuthor?: boolean;
  withCategory?: boolean;
  withFixtures?: boolean;
};

export const createMinimalArticleCategoryResources = (
  options: MinimalArticleCategoryOptions = {}
): BuilderResources => {
  const {
    withComponents = false,
    withAuthor = false,
    withCategory = true,
    withFixtures = true,
  } = options;

  const articleSchema = withComponents
    ? withCategory
      ? articleWithComponentsSchemaWithCategories
      : articleWithComponentsSchema
    : articleWithCategoriesSchema;

  const components = withComponents
    ? {
        'article.comp': compSchema,
        'article.dz_comp': dzCompSchema,
      }
    : {};

  const contentTypes: BuilderResources['schemas']['content-types'] = {};

  if (withCategory) {
    contentTypes[CATEGORY_UID] = minimalCategorySchema;
  }

  contentTypes[ARTICLE_UID] = articleSchema;

  if (withAuthor) {
    contentTypes[AUTHOR_UID] = authorSchema;
  }

  const fixtures: BuilderResources['fixtures']['content-types'] = {};

  if (withCategory) {
    fixtures[CATEGORY_UID] = withFixtures ? categoryFixtures : [];
  }

  fixtures[ARTICLE_UID] = withFixtures && withComponents ? deleteArticleFixtures : [];

  if (withAuthor) {
    fixtures[AUTHOR_UID] = [];
  }

  return {
    locales: [
      { name: 'nl', code: 'nl' },
      { name: 'en', code: 'en' },
    ],
    schemas: {
      components,
      'content-types': contentTypes,
    },
    fixtures: {
      'content-types': fixtures,
    },
  };
};
