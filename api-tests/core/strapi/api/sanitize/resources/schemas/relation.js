'use strict';

module.exports = {
  displayName: 'Relation',
  singularName: 'relation',
  pluralName: 'relations',
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
    password: {
      type: 'password',
    },
  },
};
