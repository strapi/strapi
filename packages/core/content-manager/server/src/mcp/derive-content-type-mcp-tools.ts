import { z } from '@strapi/utils';
import type { Core, Modules, UID } from '@strapi/types';

import { ACTIONS } from '../services/permission-checker';

import type { ContentManagerModelForMcp, McpToolsBuildContext, DerivedTool } from './types';
import { slugifyUidForMcpToolName, describeTool } from './utils';
import { buildLocaleSchema, resolvePermittedLocaleSchema, getPermittedFields } from './permissions';
import {
  statusSchema,
  documentIdSchema,
  pageSchema,
  pageSizeSchema,
  buildDataSchema,
  buildSortSchema,
  buildFiltersSchema,
  buildDocumentOutputSchema,
  buildListOutputSchema,
  buildDeleteOutputSchema,
} from './schemas';
import {
  createCollectionListHandler,
  createCollectionGetHandler,
  createCollectionCreateHandler,
  createCollectionUpdateHandler,
  createCollectionDeleteHandler,
  createCollectionPublishHandler,
  createCollectionUnpublishHandler,
  createCollectionDiscardDraftHandler,
  createSingleGetHandler,
  createSingleWriteHandler,
  createSingleDeleteHandler,
  createSinglePublishHandler,
  createSingleUnpublishHandler,
  createSingleDiscardDraftHandler,
} from './handlers';

// ---------------------------------------------------------------------------
// Public re-exports — backward compatibility with existing test imports
// ---------------------------------------------------------------------------
export type { ContentManagerModelForMcp };
export { slugifyUidForMcpToolName } from './utils';
export { buildSortSchema, buildFiltersSchema, buildDataSchema } from './schemas';
export { getComponentLeafPaths } from './permissions';

// ---------------------------------------------------------------------------
// Collection-type tool-definition builder
// ---------------------------------------------------------------------------

/**
 * Derives the full set of `DerivedTool` definitions for a single collection-type model.
 * Produces list/get/create/update/delete tools, plus publish/unpublish/discard_draft
 * when draft-and-publish is enabled. Each tool's input/output schema is resolved
 * per-request so RBAC field and locale constraints are applied at call time.
 */
const buildCollectionTools = (
  strapi: Core.Strapi,
  model: ContentManagerModelForMcp,
  ctx: McpToolsBuildContext
): DerivedTool[] => {
  const uid = model.uid as UID.CollectionType;
  const slug = slugifyUidForMcpToolName(uid);
  const draftAndPublish = model.options?.draftAndPublish === true;
  const { attributes } = model;
  const runtimeLocaleSchema = buildLocaleSchema(ctx.localeCodes, ctx.defaultLocale);

  const resolveReadFields = (context: Modules.MCP.McpHandlerContext) =>
    getPermittedFields(strapi, context.userAbility, ACTIONS.read, uid, attributes);

  const resolveReadOutputSchema = (context: Modules.MCP.McpHandlerContext) =>
    buildDocumentOutputSchema(attributes, resolveReadFields(context));

  const resolveListInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const readFields = resolveReadFields(context);
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.read,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      locale: localeSchema,
      status: statusSchema,
      page: pageSchema,
      pageSize: pageSizeSchema,
      sort: buildSortSchema(attributes, readFields),
      filters: buildFiltersSchema(attributes, readFields),
    });
  };

  const resolveGetInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.read,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      documentId: documentIdSchema,
      locale: localeSchema,
      status: statusSchema,
    });
  };

  const resolveCreateInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const writeFields = getPermittedFields(
      strapi,
      context.userAbility,
      ACTIONS.create,
      uid,
      attributes
    );
    const dataSchema = buildDataSchema(strapi, model, attributes, writeFields);
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.create,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({ data: dataSchema, locale: localeSchema });
  };

  const resolveUpdateInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const writeFields = getPermittedFields(
      strapi,
      context.userAbility,
      ACTIONS.update,
      uid,
      attributes
    );
    const dataSchema = buildDataSchema(strapi, model, attributes, writeFields);
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.update,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      documentId: documentIdSchema,
      data: dataSchema,
      locale: localeSchema,
    });
  };

  const resolveDeleteInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.delete,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      documentId: documentIdSchema,
      locale: localeSchema,
    });
  };

  const resolvePublishInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.publish,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      documentId: documentIdSchema,
      locale: localeSchema,
    });
  };

  const resolveUnpublishInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.unpublish,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      documentId: documentIdSchema,
      locale: localeSchema,
      discardDraft: z.boolean().optional().describe('Also discard the draft when unpublishing.'),
    });
  };

  const resolveDiscardDraftInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.discard,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      documentId: documentIdSchema,
      locale: localeSchema,
    });
  };

  const tools: DerivedTool[] = [
    {
      name: `list_${slug}`,
      telemetry: { source: 'content-manager', name: 'list' },
      ...describeTool({ apiID: model.apiID, uid, operation: 'list' }),
      auth: { policies: [{ action: ACTIONS.read, subject: uid }] },
      resolveInputSchema: resolveListInputSchema,
      resolveOutputSchema: (context) =>
        buildListOutputSchema(attributes, resolveReadFields(context)),
      createHandler: createCollectionListHandler(uid),
    },
    {
      name: `get_${slug}`,
      telemetry: { source: 'content-manager', name: 'get' },
      ...describeTool({ apiID: model.apiID, uid, operation: 'get' }),
      auth: { policies: [{ action: ACTIONS.read, subject: uid }] },
      resolveInputSchema: resolveGetInputSchema,
      resolveOutputSchema: resolveReadOutputSchema,
      createHandler: createCollectionGetHandler(uid),
    },
    {
      name: `create_${slug}`,
      telemetry: { source: 'content-manager', name: 'create' },
      ...describeTool({ apiID: model.apiID, uid, operation: 'create' }),
      auth: { policies: [{ action: ACTIONS.create, subject: uid }] },
      resolveInputSchema: resolveCreateInputSchema,
      resolveOutputSchema: resolveReadOutputSchema,
      createHandler: createCollectionCreateHandler(uid),
    },
    {
      name: `update_${slug}`,
      telemetry: { source: 'content-manager', name: 'update' },
      ...describeTool({ apiID: model.apiID, uid, operation: 'update' }),
      auth: { policies: [{ action: ACTIONS.update, subject: uid }] },
      resolveInputSchema: resolveUpdateInputSchema,
      resolveOutputSchema: resolveReadOutputSchema,
      createHandler: createCollectionUpdateHandler(uid),
    },
    {
      name: `delete_${slug}`,
      telemetry: { source: 'content-manager', name: 'delete' },
      ...describeTool({ apiID: model.apiID, uid, operation: 'delete' }),
      auth: { policies: [{ action: ACTIONS.delete, subject: uid }] },
      resolveInputSchema: resolveDeleteInputSchema,
      resolveOutputSchema: (context) =>
        buildDeleteOutputSchema(attributes, resolveReadFields(context)),
      createHandler: createCollectionDeleteHandler(uid),
    },
  ];

  if (draftAndPublish === true) {
    tools.push(
      {
        name: `publish_${slug}`,
        telemetry: { source: 'content-manager', name: 'publish' },
        ...describeTool({ apiID: model.apiID, uid, operation: 'publish' }),
        auth: { policies: [{ action: ACTIONS.publish, subject: uid }] },
        resolveInputSchema: resolvePublishInputSchema,
        resolveOutputSchema: resolveReadOutputSchema,
        createHandler: createCollectionPublishHandler(uid),
      },
      {
        name: `unpublish_${slug}`,
        telemetry: { source: 'content-manager', name: 'unpublish' },
        ...describeTool({ apiID: model.apiID, uid, operation: 'unpublish' }),
        auth: { policies: [{ action: ACTIONS.unpublish, subject: uid }] },
        resolveInputSchema: resolveUnpublishInputSchema,
        resolveOutputSchema: resolveReadOutputSchema,
        createHandler: createCollectionUnpublishHandler(uid),
      },
      {
        name: `discard_${slug}_draft`,
        telemetry: { source: 'content-manager', name: 'discard_draft' },
        ...describeTool({ apiID: model.apiID, uid, operation: 'discard_draft' }),
        auth: { policies: [{ action: ACTIONS.discard, subject: uid }] },
        resolveInputSchema: resolveDiscardDraftInputSchema,
        resolveOutputSchema: resolveReadOutputSchema,
        createHandler: createCollectionDiscardDraftHandler(uid),
      }
    );
  }

  return tools;
};

// ---------------------------------------------------------------------------
// Single-type tool-definition builder
// ---------------------------------------------------------------------------

/**
 * Derives the full set of `DerivedTool` definitions for a single single-type model.
 * Produces get/write/delete tools, plus publish/unpublish/discard_draft when
 * draft-and-publish is enabled. Each tool's input/output schema is resolved
 * per-request so RBAC field and locale constraints are applied at call time.
 */
const buildSingleTypeTools = (
  strapi: Core.Strapi,
  model: ContentManagerModelForMcp,
  ctx: McpToolsBuildContext
): DerivedTool[] => {
  const uid = model.uid as UID.SingleType;
  const slug = slugifyUidForMcpToolName(uid);
  const draftAndPublish = model.options?.draftAndPublish === true;
  const { attributes } = model;
  const runtimeLocaleSchema = buildLocaleSchema(ctx.localeCodes, ctx.defaultLocale);

  const resolveReadFields = (context: Modules.MCP.McpHandlerContext) =>
    getPermittedFields(strapi, context.userAbility, ACTIONS.read, uid, attributes);

  const resolveReadOutputSchema = (context: Modules.MCP.McpHandlerContext) =>
    buildDocumentOutputSchema(attributes, resolveReadFields(context));

  const resolveGetInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.read,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      locale: localeSchema,
      status: statusSchema,
    });
  };

  const resolveWriteInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const createFields = getPermittedFields(
      strapi,
      context.userAbility,
      ACTIONS.create,
      uid,
      attributes
    );
    const updateFields = getPermittedFields(
      strapi,
      context.userAbility,
      ACTIONS.update,
      uid,
      attributes
    );
    // null means all fields permitted; union of null with anything is null (all permitted)
    const writeFields: Set<string> | null =
      createFields === null || updateFields === null
        ? null
        : new Set([...createFields, ...updateFields]);
    const dataSchema = buildDataSchema(strapi, model, attributes, writeFields);
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.update,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({ data: dataSchema, locale: localeSchema });
  };

  const resolveDeleteInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.delete,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      locale: localeSchema,
    });
  };

  const resolvePublishInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.publish,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      locale: localeSchema,
    });
  };

  const resolveUnpublishInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.unpublish,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      locale: localeSchema,
      discardDraft: z.boolean().optional().describe('Also discard the draft when unpublishing.'),
    });
  };

  const resolveDiscardDraftInputSchema = (context: Modules.MCP.McpHandlerContext) => {
    const localeSchema = resolvePermittedLocaleSchema(
      strapi,
      context,
      ACTIONS.discard,
      uid,
      ctx.localeCodes,
      ctx.defaultLocale,
      runtimeLocaleSchema
    );
    return z.object({
      locale: localeSchema,
    });
  };

  const tools: DerivedTool[] = [
    {
      name: `get_${slug}`,
      telemetry: { source: 'content-manager', name: 'get' },
      ...describeTool({ apiID: model.apiID, uid, operation: 'get' }),
      auth: { policies: [{ action: ACTIONS.read, subject: uid }] },
      resolveInputSchema: resolveGetInputSchema,
      resolveOutputSchema: resolveReadOutputSchema,
      createHandler: createSingleGetHandler(uid),
    },
    {
      name: `write_${slug}`,
      telemetry: { source: 'content-manager', name: 'write' },
      ...describeTool({ apiID: model.apiID, uid, operation: 'write' }),
      auth: {
        policies: [
          { action: ACTIONS.create, subject: uid },
          { action: ACTIONS.update, subject: uid },
        ],
      },
      resolveInputSchema: resolveWriteInputSchema,
      resolveOutputSchema: resolveReadOutputSchema,
      createHandler: createSingleWriteHandler(uid),
    },
    {
      name: `delete_${slug}`,
      telemetry: { source: 'content-manager', name: 'delete' },
      ...describeTool({ apiID: model.apiID, uid, operation: 'delete' }),
      auth: { policies: [{ action: ACTIONS.delete, subject: uid }] },
      resolveInputSchema: resolveDeleteInputSchema,
      resolveOutputSchema: (context) =>
        buildDeleteOutputSchema(attributes, resolveReadFields(context)),
      createHandler: createSingleDeleteHandler(uid),
    },
  ];

  if (draftAndPublish === true) {
    tools.push(
      {
        name: `publish_${slug}`,
        telemetry: { source: 'content-manager', name: 'publish' },
        ...describeTool({ apiID: model.apiID, uid, operation: 'publish' }),
        auth: { policies: [{ action: ACTIONS.publish, subject: uid }] },
        resolveInputSchema: resolvePublishInputSchema,
        resolveOutputSchema: resolveReadOutputSchema,
        createHandler: createSinglePublishHandler(uid),
      },
      {
        name: `unpublish_${slug}`,
        telemetry: { source: 'content-manager', name: 'unpublish' },
        ...describeTool({ apiID: model.apiID, uid, operation: 'unpublish' }),
        auth: { policies: [{ action: ACTIONS.unpublish, subject: uid }] },
        resolveInputSchema: resolveUnpublishInputSchema,
        resolveOutputSchema: resolveReadOutputSchema,
        createHandler: createSingleUnpublishHandler(uid),
      },
      {
        name: `discard_${slug}_draft`,
        telemetry: { source: 'content-manager', name: 'discard_draft' },
        ...describeTool({ apiID: model.apiID, uid, operation: 'discard_draft' }),
        auth: { policies: [{ action: ACTIONS.discard, subject: uid }] },
        resolveInputSchema: resolveDiscardDraftInputSchema,
        resolveOutputSchema: resolveReadOutputSchema,
        createHandler: createSingleDiscardDraftHandler(uid),
      }
    );
  }

  return tools;
};

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Builds MCP tool definitions for displayed content-manager models.
 * Visibility is enforced separately via static auth on each tool and MCP session capability sync.
 */
export const deriveDisplayedContentTypeMcpToolDefinitions = (
  strapi: Core.Strapi,
  models: ContentManagerModelForMcp[],
  ctx: McpToolsBuildContext = { localeCodes: null, defaultLocale: null }
): DerivedTool[] => {
  const tools: DerivedTool[] = [];

  for (const model of models) {
    if (model.kind === 'collectionType') {
      tools.push(...buildCollectionTools(strapi, model, ctx));
    } else if (model.kind === 'singleType') {
      tools.push(...buildSingleTypeTools(strapi, model, ctx));
    }
  }

  return tools;
};
