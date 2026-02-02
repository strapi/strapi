export const RELEASE_MODEL_UID = 'plugin::content-releases.release';
export const RELEASE_ACTION_MODEL_UID = 'plugin::content-releases.release-action';

export const ACTIONS = [
  {
    section: 'plugins',
    displayName: 'Read',
    uid: 'read',
    pluginName: 'content-releases',
  },
  {
    section: 'plugins',
    displayName: 'Create',
    uid: 'create',
    pluginName: 'content-releases',
  },
  {
    section: 'plugins',
    displayName: 'Edit',
    uid: 'update',
    pluginName: 'content-releases',
  },
  {
    section: 'plugins',
    displayName: 'Delete',
    uid: 'delete',
    pluginName: 'content-releases',
  },
  {
    section: 'plugins',
    displayName: 'Publish',
    uid: 'publish',
    pluginName: 'content-releases',
  },
  {
    section: 'plugins',
    displayName: 'Remove an entry from a release',
    uid: 'delete-action',
    pluginName: 'content-releases',
  },
  {
    section: 'plugins',
    displayName: 'Add an entry to a release',
    uid: 'create-action',
    pluginName: 'content-releases',
  },

  // Settings
  {
    uid: 'settings.read',
    section: 'settings',
    displayName: 'Read',
    category: 'content releases',
    subCategory: 'options',
    pluginName: 'content-releases',
  },

  {
    uid: 'settings.update',
    section: 'settings',
    displayName: 'Edit',
    category: 'content releases',
    subCategory: 'options',
    pluginName: 'content-releases',
  },
];

export const ALLOWED_WEBHOOK_EVENTS = {
  RELEASES_PUBLISH: 'releases.publish',
};
