export default {
  schema: {
    collectionName: 'strapi_space_webhook_bindings',
    info: {
      name: 'Webhook space binding',
      description: 'The space a webhook belongs to',
      singularName: 'webhook-space',
      pluralName: 'webhook-spaces',
      displayName: 'Webhook space binding',
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
      spaces: {
        scoped: false,
      },
    },
    attributes: {
      /**
       * Webhooks live on the core store rather than as a content type, so they
       * are referred to by id rather than by relation.
       */
      webhookId: {
        type: 'string',
        required: true,
        unique: true,
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
