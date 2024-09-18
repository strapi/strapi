'use strict';

module.exports = {
  kind: 'collectionType',
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
    password: {
      type: 'password',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    private: {
      type: 'string',
      private: true,
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
    // article.compo-unique-top-level contains a nested component with every
    // kind of unique field.
    // These are used to test the validation of component unique fields in every case.
    identifiers: {
      type: 'component',
      repeatable: false,
      component: 'article.compo-unique-top-level',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    repeatableIdentifiers: {
      type: 'component',
      repeatable: true,
      component: 'article.compo-unique-top-level',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    identifiersDz: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'dynamiczone',
      components: ['article.compo-unique-all'],
    },
    categories: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::category.category',
    },
    categories_private: {
      private: true,
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::category.category',
    },
    dz: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'dynamiczone',
      components: ['article.dz-comp', 'article.dz-other-comp'],
    },
  },
};
