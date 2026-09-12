/**
 * The licence feature that unlocks Spaces, as the admin knows it.
 *
 * The server gates the same name, and also accepts an environment override
 * while the feature is rolled out to licences; the admin cannot see that, so a
 * project using the override will not show these screens until the licence
 * carries the feature.
 */
export const FEATURE_ID = 'cms-spaces';

/** Header naming the space a request acts in. `*` asks for the all-spaces view. */
export const SPACE_HEADER = 'X-Strapi-Space';

export const ALL_SPACES = '*';

/**
 * Where the last chosen space is remembered, per admin user.
 *
 * This is a convenience, never an authorisation: the server decides what the
 * caller may do with the space they name, and refuses the ones they may not
 * enter.
 */
export const STORAGE_KEY = 'strapi-spaces:selected';

export const PERMISSIONS = {
  read: [{ action: 'plugin::spaces.spaces.read', subject: null }],
  manage: [{ action: 'plugin::spaces.spaces.manage', subject: null }],
  manageMembers: [{ action: 'plugin::spaces.members.manage', subject: null }],
  accessAll: [{ action: 'plugin::spaces.spaces.access-all', subject: null }],
};
