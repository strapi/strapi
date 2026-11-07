export default {
  schema: {
    collectionName: 'email_templates',
    info: {
      singularName: 'template',
      pluralName: 'templates',
      displayName: 'Email template',
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
        required: true,
      },
      locale: {
        type: 'string',
        required: true,
        default: 'en',
      },
      subject: {
        type: 'string',
      },
      html: {
        type: 'text',
      },
      text: {
        type: 'text',
      },
    },
  },
};
