import type { Struct } from '@strapi/types';

import { FOLDER_MODEL_UID } from '../constants';

export default {
  schema: {
    collectionName: 'files',
    info: {
      singularName: 'file',
      pluralName: 'files',
      displayName: 'File',
      description: '',
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
        configurable: false,
        required: true,
      },
      alternativeText: {
        type: 'string',
        configurable: false,
      },
      caption: {
        type: 'string',
        configurable: false,
      },
      width: {
        type: 'integer',
        configurable: false,
      },
      height: {
        type: 'integer',
        configurable: false,
      },
      formats: {
        type: 'json',
        configurable: false,
      },
      hash: {
        type: 'string',
        configurable: false,
        required: true,
      },
      ext: {
        type: 'string',
        configurable: false,
      },
      mime: {
        type: 'string',
        configurable: false,
        required: true,
      },
      size: {
        type: 'decimal',
        configurable: false,
        required: true,
      },
      url: {
        type: 'string',
        configurable: false,
        required: true,
      },
      previewUrl: {
        type: 'string',
        configurable: false,
      },
      provider: {
        type: 'string',
        configurable: false,
        required: true,
      },
      provider_metadata: {
        type: 'json',
        configurable: false,
      },
      related: {
        type: 'relation',
        relation: 'morphToMany',
        configurable: false,
      },
      folder: {
        type: 'relation',
        relation: 'manyToOne',
        target: FOLDER_MODEL_UID,
        inversedBy: 'files',
        private: true,
      },
      folderPath: {
        type: 'string',
        minLength: 1,
        required: true,
        private: true,
        searchable: false,
      },
    },
    // experimental feature:
    indexes: [
      {
        name: 'upload_files_folder_path_index',
        columns: ['folder_path'],
        type: null,
      },
      {
        name: `upload_files_created_at_index`,
        columns: ['created_at'],
        type: null,
      },
      {
        name: `upload_files_updated_at_index`,
        columns: ['updated_at'],
        type: null,
      },
      {
        name: `upload_files_name_index`,
        columns: ['name'],
        type: null,
      },
      {
        name: `upload_files_size_index`,
        columns: ['size'],
        type: null,
      },
      {
        name: `upload_files_ext_index`,
        columns: ['ext'],
        type: null,
      },
    ],
  } satisfies Partial<Struct.CollectionTypeSchema>,
};
