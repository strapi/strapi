export default {
  schema: {
    collectionName: 'strapi_email_templates',
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
      // i18n replaces `locale` on every content type with an optional string, so `required` and
      // `default` would never apply here. The templates service always writes a locale.
      locale: {
        type: 'string',
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
