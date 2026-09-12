export default {
  schema: {
    collectionName: 'strapi_space_memberships',
    info: {
      name: 'Space membership',
      description: "An admin user's access to one space, and the roles they hold there",
      singularName: 'space-membership',
      pluralName: 'space-memberships',
      displayName: 'Space membership',
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
      // Memberships are read while resolving which space a request runs in, so
      // they cannot themselves be subject to that resolution.
      spaces: {
        scoped: false,
      },
    },
    attributes: {
      space: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'plugin::spaces.space',
        inversedBy: 'memberships',
        required: true,
      },
      user: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        required: true,
      },
      /**
       * The roles this user holds *in this space*. Empty means they keep the
       * roles assigned to them platform-wide, which is the common setup.
       */
      roles: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'admin::role',
      },
    },
  },
};
