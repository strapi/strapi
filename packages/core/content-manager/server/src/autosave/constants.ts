export const AUTOSAVE_UID = 'plugin::content-manager.autosave';

/**
 * Documents that have never been created have no `documentId` to key a server row on, so the
 * create flow stays on the browser-only backup.
 */
export const CREATE_SESSION_PREFIX = 'create:';
