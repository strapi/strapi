export const MCP_NOT_FOUND_ASSET = 'Media asset not found.';

export const MCP_UPDATE_ASSET_NO_FIELDS =
  'Provide at least one field to update: name, alternativeText or caption. To move an asset between folders use media_move_assets; url, mime, size and the file contents are owned by the upload provider and cannot be edited over MCP.';

export const MCP_NOT_FOUND_FOLDER = 'Media folder not found.';

export const MCP_FOLDER_NAME_TAKEN =
  'A folder with this name already exists in the same parent folder. Folder names must be unique among siblings.';

export const MCP_PARENT_FOLDER_NOT_FOUND =
  'The parent folder does not exist. Use list_folders to discover valid folder ids, or pass null for the media library root.';

export const MCP_FOLDER_MOVE_INTO_SELF =
  'A folder cannot be moved into itself or into one of its own descendants.';

/**
 * Returned when `delete_folder` is handed ids that resolve to no folder at all.
 *
 * Folder ids and asset ids are indistinguishable integers, so the most likely cause is an agent
 * passing asset ids — the message names that explicitly rather than reporting an empty cascade.
 */
export const MCP_DELETE_FOLDER_NO_MATCH =
  'None of the given ids match a media folder. delete_folder takes FOLDER ids only — asset ids are a separate namespace; use delete_media to delete assets, and list_folders to discover folder ids.';
