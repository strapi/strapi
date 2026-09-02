import type { Core } from '@strapi/types';

import { ACTIONS } from '../constants';
import type { UploadMcpTool } from './types';
import {
  listMediaInputSchema,
  getMediaInputSchema,
  listMediaOutputSchema,
  getMediaOutputSchema,
  listFoldersOutputSchema,
  updateMediaInputSchema,
  updateMediaOutputSchema,
} from './schemas';
import {
  createListMediaHandler,
  createGetMediaHandler,
  createListFoldersHandler,
  createUpdateMediaHandler,
} from './handlers';

/**
 * The Media Library MCP tools.
 *
 * Exported separately from registration so unit tests can assert the definitions (names, auth
 * policies, schemas) without booting Strapi or an MCP server.
 *
 * Every tool description states that media uses numeric ids. The content-manager tools key
 * everything on `documentId`, which does not exist on files, so the distinction is spelled out
 * per tool rather than left to be inferred.
 *
 * The Media Library actions are registered in the `plugins` section with no subject (see the
 * upload plugin bootstrap), so the policies carry an action only — a subject-less grant
 * registers as CASL `subject: 'all'`. The per-model check still happens inside the handlers,
 * where the permissions manager is bound to the file or folder UID.
 *
 * Read tools are gated on `plugin::upload.read`; writes take the separate
 * `plugin::upload.assets.update`, so a read-only token never gains an editing tool.
 */
export const buildUploadMcpToolDefinitions = (): UploadMcpTool[] => [
  {
    name: 'list_media',
    title: 'Media: list assets',
    description:
      'List Media Library assets with pagination, folder / mime type / name filters and sorting. Assets are identified by a numeric id — media files are not documents and have no documentId.',
    telemetry: { source: 'upload', name: 'list' },
    auth: { policies: [{ action: ACTIONS.read }] },
    resolveInputSchema: () => listMediaInputSchema,
    resolveOutputSchema: () => listMediaOutputSchema,
    createHandler: createListMediaHandler,
  },
  {
    name: 'get_media',
    title: 'Media: get asset',
    description:
      'Get a single Media Library asset by its numeric id. Media files are not documents: use the numeric id, not a documentId.',
    telemetry: { source: 'upload', name: 'get' },
    auth: { policies: [{ action: ACTIONS.read }] },
    resolveInputSchema: () => getMediaInputSchema,
    resolveOutputSchema: () => getMediaOutputSchema,
    createHandler: createGetMediaHandler,
  },
  {
    name: 'list_folders',
    title: 'Media: list folders',
    description:
      'List the Media Library folder structure as a nested tree. Folders are identified by a numeric id; pass one as `folderId` to list_media to list its contents.',
    telemetry: { source: 'upload', name: 'list_folders' },
    auth: { policies: [{ action: ACTIONS.read }] },
    resolveOutputSchema: () => listFoldersOutputSchema,
    createHandler: createListFoldersHandler,
  },
  {
    name: 'update_media',
    title: 'Media: update asset metadata',
    description:
      "Update the editable metadata of a Media Library asset, identified by its numeric id. Only name, alternativeText and caption can be written: use move_media to change an asset's folder, and note that url, mime, size and the file contents are owned by the upload provider and cannot be edited over MCP.",
    telemetry: { source: 'upload', name: 'update' },
    auth: { policies: [{ action: ACTIONS.update }] },
    resolveInputSchema: () => updateMediaInputSchema,
    resolveOutputSchema: () => updateMediaOutputSchema,
    createHandler: createUpdateMediaHandler,
  },
];

/**
 * Registers the Media Library MCP tools via `strapi.ai.mcp.registerTool()`.
 * Must be called from the plugin register phase, before the MCP HTTP server starts.
 */
export const registerUploadMcpTools = ({ strapi }: { strapi: Core.Strapi }): void => {
  // Performance only: registerTool() is safe when MCP is disabled (definitions are stored but
  // never exposed). Skip the work below when the MCP server will not start.
  if (strapi.ai?.mcp?.isEnabled() !== true) {
    return;
  }

  for (const tool of buildUploadMcpToolDefinitions()) {
    strapi.ai.mcp.registerTool(tool);
  }
};
