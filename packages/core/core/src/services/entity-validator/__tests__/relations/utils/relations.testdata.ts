export const models = new Map();

models.set('api::dev.dev', {
  kind: 'collectionType',
  collectionName: 'devs',
  modelType: 'contentType',
  modelName: 'dev',
  uid: 'api::dev.dev',
  apiName: 'dev',
  globalId: 'Dev',
  info: {
    singularName: 'dev',
    pluralName: 'devs',
    displayName: 'Dev',
    description: '',
  },
  attributes: {
    categories: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::category.category',
      inversedBy: 'devs',
    },
    sCom: {
      type: 'component',
      repeatable: false,
      component: 'basic.dev-compo',
    },
    rCom: {
      type: 'component',
      repeatable: true,
      component: 'basic.dev-compo',
    },
    DZ: {
      type: 'dynamiczone',
      components: ['basic.dev-compo'],
    },
    media: {
      allowedTypes: ['images', 'files', 'videos', 'audios'],
      type: 'media',
      multiple: true,
    },
    createdAt: {
      type: 'datetime',
    },
    updatedAt: {
      type: 'datetime',
    },
    publishedAt: {
      type: 'datetime',
      configurable: false,
      writable: true,
      visible: false,
    },
    createdBy: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'admin::user',
      configurable: false,
      writable: false,
      visible: false,
      useJoinTable: false,
      private: true,
    },
    updatedBy: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'admin::user',
      configurable: false,
      writable: false,
      visible: false,
      useJoinTable: false,
      private: true,
    },
  },
});
models.set('api::category.category', {
  kind: 'collectionType',
  collectionName: 'categories',
  modelType: 'contentType',
  modelName: 'category',
  uid: 'api::category.category',
  apiName: 'category',
  globalId: 'Category',
  info: {
    displayName: 'Category',
    singularName: 'category',
    pluralName: 'categories',
    description: '',
    name: 'Category',
  },
  attributes: {
    name: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
});
models.set('basic.dev-compo', {
  collectionName: 'components_basic_dev_compos',
  uid: 'basic.dev-compo',
  category: 'basic',
  modelType: 'component',
  modelName: 'dev-compo',
  globalId: 'ComponentBasicDevCompo',
  info: {
    displayName: 'DevCompo',
    icon: 'allergies',
  },
  attributes: {
    categories: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::category.category',
    },
  },
});
models.set('plugin::upload.file', {
  collectionName: 'files',
  info: {
    singularName: 'file',
    pluralName: 'files',
    displayName: 'File',
    description: '',
  },
  attributes: {
    name: {
      type: 'string',
      configurable: false,
      required: true,
    },
  },
  kind: 'collectionType',
  modelType: 'contentType',
  modelName: 'file',
  uid: 'plugin::upload.file',
  plugin: 'upload',
  globalId: 'UploadFile',
});

export const existentIDs = [1, 2, 3, 4, 5, 6];
export const nonExistentIds = [10, 11, 12, 13, 14, 15, 16];
