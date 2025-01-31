'use strict';

module.exports = {
  displayName: 'Document',
  singularName: 'document',
  pluralName: 'documents',
  kind: 'collectionType',

  attributes: {
    name: {
      type: 'string',
      private: false,
    },
    name_private: {
      type: 'string',
      private: true,
    },
    name_non_searchable: {
      type: 'string',
      searchable: false,
    },
    password: {
      type: 'password',
    },
    misc: {
      type: 'integer',
    },
    relations: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::relation.relation',
      targetAttribute: 'documents',
    },
    componentA: {
      type: 'component',
      component: 'default.component-a',
      repeatable: false,
    },
    dz: {
      type: 'dynamiczone',
      components: ['default.component-a', 'default.component-b'],
    },
  },
};
