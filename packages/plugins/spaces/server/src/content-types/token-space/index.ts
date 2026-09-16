export default {
  schema: {
    collectionName: 'strapi_space_token_bindings',
    info: {
      name: 'Token space binding',
      description: 'The space an API or admin token acts in',
      singularName: 'token-space',
      pluralName: 'token-spaces',
      displayName: 'Token space binding',
    },
    options: {
      draftAndPublish: false,
    },
    pluginOptions: {
      'content-manager': {
        visible: false,
      },
      'content-type-builder': {
        visible: false,
      },
      // Read while a request's space is still being worked out, so it cannot
      // itself depend on that space.
      spaces: {
        scoped: false,
      },
    },
    attributes: {
      token: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::api-token',
        required: true,
      },
      space: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'plugin::spaces.space',
        required: true,
      },
    },
  },
};
