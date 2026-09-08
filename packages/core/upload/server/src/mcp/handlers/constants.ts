export const MCP_NOT_FOUND_ASSET = 'Media asset not found.';

export const MCP_UPDATE_ASSET_NO_FIELDS =
  'Provide at least one field to update: name, alternativeText or caption. To move an asset between folders use media_move_assets; url, mime, size and the file contents are owned by the upload provider and cannot be edited over MCP.';

export const MCP_NOT_FOUND_FOLDER = 'Media folder not found.';

export const MCP_FOLDER_NAME_TAKEN =
  'A folder with this name already exists in the same parent folder. Folder names must be unique among siblings.';

export const MCP_PARENT_FOLDER_NOT_FOUND =
  'The parent folder does not exist. Use media_list_folders to discover valid folder ids, or pass null for the media library root.';

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
  `These ids do not match any media folder: ${ids.join(', ')}. Nothing was deleted — media_delete_folder rejects the whole request rather than deleting the folders that did match, because folder ids and asset ids are indistinguishable integers. If these are asset ids, use media_delete_assets instead; otherwise the folders may already be gone. Use media_list_folders to discover valid folder ids.`;

export const MCP_MOVE_MEDIA_DESTINATION_NOT_FOUND =
  'The destination folder does not exist. Use media_list_folders to discover valid folder ids, or pass null for the media library root.';

/** Per-id `failed` reasons for `media_move_assets`. Both are per asset, so the wording names the id's fate, not the call's. */
export const MCP_MOVE_MEDIA_ID_NOT_FOUND =
  'No media asset has this id. Asset ids and folder ids are indistinguishable integers: if this is a folder id, use media_move_folder. Otherwise the asset may already be deleted — use media_list_assets to discover valid asset ids.';

export const MCP_MOVE_MEDIA_ID_FORBIDDEN =
  'This token is not allowed to edit this asset. A permission condition on plugin::upload.assets.update excludes it.';

/**
 * Returned when the move of one asset failed for a reason that is not a missing asset or a
 * permission denial — a DB error, say, or an upload-provider fault.
 *
 * Reported per id rather than thrown: a tool error carries no `structuredContent`, so throwing
 * would discard the report naming the assets that had already moved in the same call.
 * `cause` is the underlying message, kept verbatim so the real fault stays legible.
 */
export const MCP_MOVE_MEDIA_ID_FAILED = (cause: string) =>
  `Moving this asset failed: ${cause}. This is not a problem with the id itself — the asset exists and this token may edit it — so retrying may succeed. Any assets listed under \`moved\` were still moved.`;
