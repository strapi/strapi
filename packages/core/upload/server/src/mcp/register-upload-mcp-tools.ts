import type { Core } from '@strapi/types';

import { ACTIONS } from '../constants';
import type { UploadMcpTool } from './types';
import {
  listMediaInputSchema,
  getMediaInputSchema,
  listMediaOutputSchema,
  getMediaOutputSchema,
  listFoldersOutputSchema,
} from './schemas';
import {
  createListMediaHandler,
  createGetMediaHandler,
  createListFoldersHandler,
} from './handlers';

/**
 * The Media Library MCP tools.
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
