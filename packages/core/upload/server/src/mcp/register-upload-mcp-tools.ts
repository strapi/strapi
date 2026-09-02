import type { Core } from '@strapi/types';

import { ACTIONS } from '../constants';
import type { UploadMcpTool } from './types';
import {
  listMediaAssetsInputSchema,
  getMediaAssetInputSchema,
  listMediaAssetsOutputSchema,
  getMediaAssetOutputSchema,
  listMediaFoldersOutputSchema,
} from './schemas';
import {
  createListMediaAssetsHandler,
  createGetMediaAssetHandler,
  createListMediaFoldersHandler,
} from './handlers';

/**
 * The Media Library MCP read tools.
 *
 * Exported separately from registration so unit tests can assert the definitions (names, auth
 * policies, schemas) without booting Strapi or an MCP server.
 *
 * Every tool description states that media uses numeric ids. The content-manager tools key
 * everything on `documentId`, which does not exist on files, so the distinction is spelled out
 * per tool rather than left to be inferred.
 *
 * `plugin::upload.read` is registered in the `plugins` section with no subject (see the upload
 * plugin bootstrap), so the policies carry an action only — a subject-less grant registers as
 * CASL `subject: 'all'`. The per-model check still happens inside the handlers, where the
 * permissions manager is bound to the file or folder UID.
 */
export const buildUploadMcpToolDefinitions = (): UploadMcpTool[] => [
  {
    name: 'list_media_assets',
    title: 'Media: list assets',
    description:
      'List Media Library assets with pagination, folder / mime type / name filters and sorting. Assets are identified by a numeric id — media files are not documents and have no documentId.',
    telemetry: { source: 'upload', name: 'list_media_assets' },
    auth: { policies: [{ action: ACTIONS.read }] },
    resolveInputSchema: () => listMediaAssetsInputSchema,
    resolveOutputSchema: () => listMediaAssetsOutputSchema,
    createHandler: createListMediaAssetsHandler,
  },
  {
    name: 'get_media_asset',
    title: 'Media: get asset',
    description:
      'Get a single Media Library asset by its numeric id. Media files are not documents: use the numeric id, not a documentId.',
    telemetry: { source: 'upload', name: 'get_media_asset' },
    auth: { policies: [{ action: ACTIONS.read }] },
    resolveInputSchema: () => getMediaAssetInputSchema,
    resolveOutputSchema: () => getMediaAssetOutputSchema,
    createHandler: createGetMediaAssetHandler,
  },
  {
    name: 'list_media_folders',
    title: 'Media: list folders',
    description:
      'List the Media Library folder structure as a nested tree. Folders are identified by a numeric id; pass one as `folderId` to list_media_assets to list its contents.',
    telemetry: { source: 'upload', name: 'list_media_folders' },
    auth: { policies: [{ action: ACTIONS.read }] },
    resolveOutputSchema: () => listMediaFoldersOutputSchema,
    createHandler: createListMediaFoldersHandler,
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
