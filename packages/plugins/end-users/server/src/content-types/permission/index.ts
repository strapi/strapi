import { ROLE_UID } from '../../constants';

/**
 * `plugin::end-users.permission` (`eu_permissions`): one thing a role may do.
 *
 * `subject` is a content type uid (`null` for what belongs to no content type); `properties` holds
 * the field rules (`fields`, `locales`, `populateDepth`) and `conditions` the named conditions that
 * must hold, both as JSON.
 *
 * The role is a plain foreign key column on the row (`useJoinTable: false`) rather than a link
 * table: a role is saved with hundreds of permissions at once, and `createMany` can set a column
 * where it cannot write link rows. A permission belongs to exactly one role, and a role is never
 * published, so there is no second version of it for the column to point at.
 *
 * Installations that come from users-permissions have this relation in a link table
 * (`up_permissions_role_lnk`), and schema sync would drop that table, leaving every migrated
 * permission without a role. The pre-sync step of the migration (design, section 14, step 3) copies
 * the link table into `eu_permissions.role_id` before sync runs, then drops it.
 */
export default {
  schema: {
    kind: 'collectionType',
    collectionName: 'eu_permissions',
    info: {
      singularName: 'permission',
      pluralName: 'permissions',
      displayName: 'Permission',
      description: 'Something a role of end users may do',
    },
    options: { draftAndPublish: false },
    pluginOptions: {
      'content-manager': { visible: false },
      'content-type-builder': { visible: false },
      i18n: { localized: false },
    },
    attributes: {
      action: { type: 'string', required: true, minLength: 1, configurable: false },
      subject: { type: 'string', configurable: false },
      properties: { type: 'json', default: {}, configurable: false },
      conditions: { type: 'json', default: [], configurable: false },
      role: {
        type: 'relation',
        relation: 'manyToOne',
        target: ROLE_UID,
        inversedBy: 'permissions',
        useJoinTable: false,
        configurable: false,
      },
    },
  },
};
