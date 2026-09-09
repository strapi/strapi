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
 * Returned when `media_delete_folder` is handed any id that does not resolve to a folder.
 *
 * Names the offending ids, because the call rejects as a whole: the agent has to know which
 * entries to drop or correct, and cannot infer that from a generic failure. Folder ids and
 * asset ids are indistinguishable integers, so an asset id is the likeliest cause and is named
 * first — but a deleted or never-existent folder id looks the same from here, so the message
 * covers both rather than asserting one.
 */
export const MCP_DELETE_FOLDER_UNRESOLVED_IDS = (ids: number[]) =>
  `These ids do not match any media folder: ${ids.join(', ')}. Nothing was deleted — media_delete_folder rejects the whole request rather than deleting the folders that did match, because folder ids and asset ids are indistinguishable integers. If these are asset ids, use media_delete_assets instead; otherwise the folders may already be gone. Use list_folders to discover valid folder ids.`;
