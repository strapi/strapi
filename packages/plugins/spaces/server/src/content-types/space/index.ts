export default {
  schema: {
    collectionName: 'strapi_spaces',
    info: {
      name: 'Space',
      description: 'A tenant: the unit content, media and settings are isolated by',
      singularName: 'space',
      pluralName: 'spaces',
      displayName: 'Space',
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
      // The space registry itself is platform data: it is the same table every
      // space is resolved from, so it must never be filtered by the space in
      // effect.
      spaces: {
        scoped: false,
      },
    },
    attributes: {
      name: {
        type: 'string',
        required: true,
        minLength: 1,
      },
      slug: {
        type: 'string',
        required: true,
        unique: true,
        minLength: 1,
      },
      description: {
        type: 'text',
        required: false,
      },
      status: {
        type: 'enumeration',
        enum: ['active', 'archived'],
        default: 'active',
        required: true,
      },
      /**
       * The space callers land in when they do not ask for one, and the space
       * existing data was migrated into. Exactly one space carries it.
       */
      isDefault: {
        type: 'boolean',
        default: false,
        required: true,
      },
      /**
       * Which content types this space may use. `null` means all of them.
       * Schemas stay global — this restricts availability, it does not fork the
       * schema per space.
       */
      contentTypes: {
        type: 'json',
        required: false,
        default: null,
      },
      memberships: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'plugin::spaces.space-membership',
        mappedBy: 'space',
      },
    },
  },
};
