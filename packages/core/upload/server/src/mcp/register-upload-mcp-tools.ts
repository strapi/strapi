import type { Core } from '@strapi/types';

import { ACTIONS } from '../constants';
import type { UploadMcpTool } from './types';
import {
  mediaListAssetsInputSchema,
  mediaGetAssetInputSchema,
  mediaListAssetsOutputSchema,
  mediaGetAssetOutputSchema,
  mediaListFoldersOutputSchema,
  mediaUpdateAssetInputSchema,
  mediaUpdateAssetOutputSchema,
  mediaCreateFolderInputSchema,
  mediaCreateFolderOutputSchema,
  mediaRenameFolderInputSchema,
  mediaRenameFolderOutputSchema,
  mediaMoveFolderInputSchema,
  mediaMoveFolderOutputSchema,
  mediaDeleteFolderInputSchema,
  mediaDeleteFolderOutputSchema,
  moveMediaInputSchema,
  moveMediaOutputSchema,
} from './schemas';
import {
  createMediaListAssetsHandler,
  createMediaGetAssetHandler,
  createMediaListFoldersHandler,
  createMediaUpdateAssetHandler,
  createMediaCreateFolderHandler,
  createMediaRenameFolderHandler,
  createMediaMoveFolderHandler,
  createMediaDeleteFolderHandler,
  createMoveMediaHandler,
} from './handlers';

/**
 * The Media Library MCP tools.
 *
 * Folder writes inherit the same `plugin::upload.assets.update` action rather than introducing a
 * folder-specific one, matching what the admin UI enforces today. MCP-specific folder RBAC is
 * out of scope.
 *
 * Renaming and moving are separate tools for both objects — rename/update changes attributes,
 * move changes location — so an agent selects by intent instead of assembling a combined patch.
 *
 * `media_move_assets` and `media_move_folder` stay separate even though `/actions/bulk-move` accepts both id
 * lists at once. Asset ids and folder ids are indistinguishable integers from separate
 * namespaces, and both `media_list_assets` and `media_list_folders` return a plain `id` — a combined tool
 * would let an agent pass folder ids where assets were meant with nothing to object.
 */
export const buildUploadMcpToolDefinitions = (): UploadMcpTool[] => [
  {
    name: 'media_list_assets',
    title: 'Media: list assets',
    description:
      'List Media Library assets with pagination, folder / mime type / name filters and sorting. Assets are identified by a numeric id — media files are not documents and have no documentId.',
    telemetry: { source: 'upload', name: 'list' },
    auth: { policies: [{ action: ACTIONS.read }] },
    resolveInputSchema: () => mediaListAssetsInputSchema,
    resolveOutputSchema: () => mediaListAssetsOutputSchema,
    createHandler: createMediaListAssetsHandler,
  },
  {
    name: 'media_get_asset',
    title: 'Media: get asset',
    description:
      'Get a single Media Library asset by its numeric id. Media files are not documents: use the numeric id, not a documentId.',
    telemetry: { source: 'upload', name: 'get' },
    auth: { policies: [{ action: ACTIONS.read }] },
    resolveInputSchema: () => mediaGetAssetInputSchema,
    resolveOutputSchema: () => mediaGetAssetOutputSchema,
    createHandler: createMediaGetAssetHandler,
  },
  {
    name: 'media_list_folders',
    title: 'Media: list folders',
    description:
      'List the Media Library folder structure as a nested tree. Folders are identified by a numeric id; pass one as `folderId` to media_list_assets to list its contents.',
    telemetry: { source: 'upload', name: 'list_folders' },
    auth: { policies: [{ action: ACTIONS.read }] },
    resolveOutputSchema: () => mediaListFoldersOutputSchema,
    createHandler: createMediaListFoldersHandler,
  },
  {
    name: 'media_update_asset',
    title: 'Media: update asset metadata',
    description:
      "Update the editable metadata of a Media Library asset, identified by its numeric id. Only name, alternativeText and caption can be written: use media_move_assets to change an asset's folder, and note that url, mime, size and the file contents are owned by the upload provider and cannot be edited over MCP.",
    telemetry: { source: 'upload', name: 'update' },
    auth: { policies: [{ action: ACTIONS.update }] },
    resolveInputSchema: () => mediaUpdateAssetInputSchema,
    resolveOutputSchema: () => mediaUpdateAssetOutputSchema,
    createHandler: createMediaUpdateAssetHandler,
  },
  {
    name: 'media_move_assets',
    title: 'Media: move assets between folders',
    description:
      "Move Media Library assets into a different folder, in bulk. Takes `ids` — an array of numeric ASSET ids — and `folder`, the numeric id of the destination; pass `folder: null` to move them to the media library root. Both are required: use an array of one to move a single asset, and say null explicitly for the root.\n\nTakes ASSET ids only. Asset ids and folder ids are indistinguishable integers from separate namespaces, so an id that does not resolve to an asset is refused — use media_move_folder to move a folder (which carries its whole subtree). Media files are not documents: use numeric ids, not documentIds.\n\nMoving changes the folder only. Names, alt text, captions and the assets' public URLs are unaffected, so nothing referencing them breaks — use media_update_asset to edit metadata.\n\nPARTIAL SUCCESS IS POSSIBLE: a bad id among good ones does NOT roll the valid moves back. The response always reports `moved` (the assets that were moved) and `failed` (each remaining id with a reason), which together account for every id you passed — so retry only the ids in `failed`, and treat `moved` as done. This holds even when nothing moved at all: `moved` is then empty and every id is in `failed`. The one error that rejects the whole call is a destination folder that does not exist, which is checked before anything is moved.",
    telemetry: { source: 'upload', name: 'move' },
    auth: { policies: [{ action: ACTIONS.update }] },
    resolveInputSchema: () => moveMediaInputSchema,
    resolveOutputSchema: () => moveMediaOutputSchema,
    createHandler: createMoveMediaHandler,
  },
  {
    name: 'media_create_folder',
    title: 'Media: create folder',
    description:
      'Create a Media Library folder, optionally inside an existing one. Folders are identified by a numeric id: pass `parent` to nest the new folder, or omit it to create the folder at the media library root. The name must be unique among its siblings and cannot contain slashes.',
    telemetry: { source: 'upload', name: 'create_folder' },
    // `create`, not `update`, to match `POST /upload/folders` — the admin route for the same
    // operation gates on `assets.create`. The other folder tools use `update` because their
    // admin counterparts (`PUT /folders/:id` and both bulk actions) do.
    auth: { policies: [{ action: ACTIONS.create }] },
    resolveInputSchema: () => mediaCreateFolderInputSchema,
    resolveOutputSchema: () => mediaCreateFolderOutputSchema,
    createHandler: createMediaCreateFolderHandler,
  },
  {
    name: 'media_rename_folder',
    title: 'Media: rename folder',
    description:
      "Rename a Media Library folder, identified by its numeric id. Changes the folder name only and leaves its location, its contents and their URLs untouched — use media_move_folder to change which folder it sits in. The new name must be unique among the folder's siblings.",
    telemetry: { source: 'upload', name: 'rename_folder' },
    auth: { policies: [{ action: ACTIONS.update }] },
    resolveInputSchema: () => mediaRenameFolderInputSchema,
    resolveOutputSchema: () => mediaRenameFolderOutputSchema,
    createHandler: createMediaRenameFolderHandler,
  },
  {
    name: 'media_move_folder',
    title: 'Media: move folder',
    description:
      'Move a Media Library folder into a different parent folder, identified by numeric ids. The folder keeps its name and carries all of its subfolders and files with it; pass `parent: null` to move it to the media library root. A folder cannot be moved into itself or into one of its own descendants. Use media_rename_folder to change the name instead.',
    telemetry: { source: 'upload', name: 'move_folder' },
    auth: { policies: [{ action: ACTIONS.update }] },
    resolveInputSchema: () => mediaMoveFolderInputSchema,
    resolveOutputSchema: () => mediaMoveFolderOutputSchema,
    createHandler: createMediaMoveFolderHandler,
  },
  {
    name: 'media_delete_folder',
    title: 'Media: delete folder (destructive)',
    description:
      'DESTRUCTIVE AND IRREVERSIBLE. Deletes Media Library folders by numeric id and CASCADES: every subfolder and every file inside them is permanently deleted from the database and from the storage provider. There is no undo, no trash and no recycle bin, and the deleted files stop being served — any live entry or page still referencing one will break.\n\nWHETHER THE CONTAINED ASSETS ARE USED IN PUBLISHED CONTENT CANNOT BE CHECKED: Strapi does not expose "used in" information over this API, so this tool cannot tell you whether a file is referenced by an entry. Confirm with the user before deleting.\n\nCall it first WITHOUT `dryRun` (or with `dryRun: true`) to preview: nothing is deleted and the response reports how many folders and files WOULD be removed. Only after reporting those counts should you call it again with `dryRun: false` to actually delete. Takes FOLDER ids only — asset ids are a separate namespace of integers; use media_delete_assets for individual assets. All or nothing: if ANY id does not resolve to a folder the whole call is rejected and nothing is deleted, so a list mixing folder and asset ids never deletes half of what it names.',
    telemetry: { source: 'upload', name: 'delete_folder' },
    auth: { policies: [{ action: ACTIONS.update }] },
    resolveInputSchema: () => mediaDeleteFolderInputSchema,
    resolveOutputSchema: () => mediaDeleteFolderOutputSchema,
    createHandler: createMediaDeleteFolderHandler,
  },
];

/**
 * Registers the Media Library MCP tools via `strapi.ai.mcp.registerTool()`.
 * Must be called from the plugin register phase, before the MCP HTTP server starts.
 */
export const registerUploadMcpTools = ({ strapi }: { strapi: Core.Strapi }): void => {
  // No `isEnabled()` gate: registerTool() only stores the definition, and the MCP server never
  // exposes it when disabled, so registering unconditionally is a no-op there. The three
  // definitions are static, so there is no derivation cost worth guarding either.
  for (const tool of buildUploadMcpToolDefinitions()) {
    strapi.ai?.mcp?.registerTool(tool);
  }
};
