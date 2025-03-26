export default {
  collectionName: 'strapi_secrets',
  info: {
    name: 'Secret',
    singularName: 'secret',
    pluralName: 'secrets',
    displayName: 'Secret',
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
    key: {
      type: 'string',
      minLength: 1,
      configurable: false,
      required: true,
      unique: true,
    },
    value: {
      type: 'string',
      minLength: 1,
      configurable: false,
      required: true,
      searchable: false,
    },
  },
};
