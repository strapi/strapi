import { GRAPHQL_TYPE_NAMES, PERMISSION_UID } from '../../constants';

/** `public` is what a request with no credentials gets, `authenticated` what a new user gets. */
export const ROLE_TYPES = ['public', 'authenticated', 'custom'] as const;

export type RoleType = (typeof ROLE_TYPES)[number];

/**
 * `plugin::end-users.role` (`eu_roles`): a set of permissions an end user can hold.
 *
 * There is no `users` attribute. The link from a user to its roles is `user.roles`, a one-way
 * relation owned by the user type (`schema/to-content-types.ts`), so this type never changes the
 * user schema, and a role's users are counted on the link table.
 *
 * Roles are managed on the plugin's own admin pages, not in the Content Manager.
 */
export default {
  schema: {
    kind: 'collectionType',
    collectionName: 'eu_roles',
    info: {
      singularName: 'role',
      pluralName: 'roles',
      displayName: 'Role',
      description: 'A set of permissions for end users',
    },
    options: { draftAndPublish: false },
    pluginOptions: {
      'content-manager': { visible: false },
      'content-type-builder': { visible: false },
      i18n: { localized: false },
      // `EndUserRole`, `endUserRoles`, ... on GraphQL
      graphql: { typeName: GRAPHQL_TYPE_NAMES.role },
    },
    attributes: {
      // `unique: true` is Strapi's own check (a select before the insert, with a friendly error) and
      // creates no index. The index is `indexes` below, and is what keeps two instances that boot
      // together from each creating the Public role: the second one's insert is refused.
      name: { type: 'string', required: true, unique: true, minLength: 1, configurable: false },
      description: { type: 'string', configurable: false },
      // Not unique: there are as many `custom` roles as anyone makes. A unique index cannot be
      // limited to `public` and `authenticated` in a way MySQL accepts, so there is one of each
      // because they are created under fixed names, which `name` keeps unique, and looked up by
      // `type` oldest first (`service('role')`).
      type: {
        type: 'enumeration',
        enum: [...ROLE_TYPES],
        required: true,
        default: 'custom',
        configurable: false,
      },
      requireTwoFactor: { type: 'boolean', default: false, configurable: false },
      // Bumped by every save of the role: a save carries the revision its editor loaded,
      // and one built on an older copy is refused. The default is applied when a role is created, so a
      // role that existed before the column has none (null), which `service('role')` reads as 0.
      revision: { type: 'integer', default: 0, configurable: false },
      permissions: {
        type: 'relation',
        relation: 'oneToMany',
        target: PERMISSION_UID,
        mappedBy: 'role',
        configurable: false,
      },
    },
    // Named the way Strapi names a unique index on a column (`<table>_<column>_uq`), so it is the
    // same index whichever way it is declared
    indexes: [{ name: 'eu_roles_name_uq', columns: ['name'], type: 'unique' }],
  },
};
