import type { Struct } from '@strapi/types';

import { FOLDER_MODEL_UID, FILE_MODEL_UID } from '../constants';

export default {
  schema: {
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
        minLength: 1,
        required: true,
      },
      pathId: {
        type: 'integer',
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
        minLength: 1,
        required: true,
      },
    },
    // experimental feature:
    indexes: [
      {
        name: 'upload_folders_path_id_index',
        columns: ['path_id'],
        type: 'unique',
      },
      {
        name: 'upload_folders_path_index',
        columns: ['path'],
        type: 'unique',
      },
    ],
  } satisfies Partial<Struct.CollectionTypeSchema>,
};
