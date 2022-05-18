'use strict';

const { FOLDER_MODEL_UID, FILE_MODEL_UID } = require('../../constants');

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
      target: FOLDER_MODEL_UID,
      inversedBy: 'children',
    },
    children: {
      type: 'relation',
      relation: 'oneToMany',
      target: FOLDER_MODEL_UID,
      mappedBy: 'parent',
    },
    files: {
      type: 'relation',
      relation: 'oneToMany',
      target: FILE_MODEL_UID,
      mappedBy: 'folder',
    },
    path: {
      type: 'string',
      min: 1,
      required: true,
    },
  },
};
