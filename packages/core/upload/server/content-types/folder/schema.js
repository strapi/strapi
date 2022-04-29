'use strict';

module.exports = {
  collectionName: 'upload_folders',
  info: {
    singularName: 'folder',
    pluralName: 'folders',
    displayName: 'Folder',
  },
  options: {},
  pluginOptions: {
    'content-manager': {
      visible: false,
    },
    'content-type-builder': {
      visible: false,
    },
  },
  attributes: {
    name: {
      type: 'string',
      min: 1,
      required: true,
    },
    uid: {
      type: 'string',
      unique: true,
      required: true,
    },
    parent: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'plugin::upload.folder',
      inversedBy: 'children',
    },
    children: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'plugin::upload.folder',
      mappedBy: 'parent',
    },
    files: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'plugin::upload.file',
      mappedBy: 'folder',
    },
    path: {
      type: 'string',
      min: 1,
      required: true,
    },
  },
};
