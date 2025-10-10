/**
 * Lifecycle callbacks for the `Role` model.
 */

export default {
  collectionName: 'admin_roles',
  info: {
    name: 'Role',
    description: '',
    singularName: 'role',
    pluralName: 'roles',
    displayName: 'Role',
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
      unique: true,
      configurable: false,
      required: true,
    },
    code: {
      type: 'string',
      minLength: 1,
      unique: true,
      configurable: false,
      required: true,
    },
    description: {
      type: 'string',
      configurable: false,
    },
    users: {
      configurable: false,
      type: 'relation',
      relation: 'manyToMany',
      mappedBy: 'roles',
      target: 'admin::user',
    },
    permissions: {
      configurable: false,
      type: 'relation',
      relation: 'oneToMany',
      mappedBy: 'role',
      target: 'admin::permission',
    },
  },
};
