import type {
  CallToolResult,
  ContentBlock,
  GetPromptResult,
  ReadResourceResult,
  ResourceMetadata,
} from '@modelcontextprotocol/server';
import type { Modules } from '@strapi/types';

/**
 * Strapi types protocol extension metadata loosely, while the SDK narrows a few
 * reserved keys. Narrowing happens here so capability authors never have to name
 * an SDK type to attach metadata.
 */
type SdkResultMetadata = GetPromptResult['_meta'];

type SdkResourceContents = ReadResourceResult['contents'][number];

const toSdkResultMetadata = (metadata: Modules.MCP.McpMetadata | undefined): SdkResultMetadata =>
  metadata as SdkResultMetadata;

const toSdkResourceContents = (contents: Modules.MCP.McpResourceContents): SdkResourceContents => {
  if ('text' in contents) {
    const { uri, mimeType, text, _meta } = contents;
    return { uri, mimeType, text, _meta };
  }

  const { uri, mimeType, blob, _meta } = contents;
  return { uri, mimeType, blob, _meta };
};

/**
 * Maps one Strapi-owned content block onto the protocol shape the SDK transports.
 *
 * Every variant Strapi accepts is translated explicitly, so removing or renaming a
 * variant upstream fails this boundary at compile time instead of reaching authors.
 */
export const toSdkContentBlock = (content: Modules.MCP.McpContentBlock): ContentBlock => {
  switch (content.type) {
    case 'text': {
      const { type, text, annotations, _meta } = content;
      return { type, text, annotations, _meta };
    }
    case 'image': {
      const { type, data, mimeType, annotations, _meta } = content;
      return { type, data, mimeType, annotations, _meta };
    }
    case 'audio': {
      const { type, data, mimeType, annotations, _meta } = content;
      return { type, data, mimeType, annotations, _meta };
    }
    case 'resource_link': {
      const { type, name, uri, title, description, mimeType, size, icons, annotations, _meta } =
        content;
      return { type, name, uri, title, description, mimeType, size, icons, annotations, _meta };
    }
    case 'resource': {
      const { type, resource, annotations, _meta } = content;
      return { type, resource: toSdkResourceContents(resource), annotations, _meta };
    }
    default: {
      const unsupported: never = content;
      throw new Error(`[MCP] Unsupported content block: ${JSON.stringify(unsupported)}`);
    }
  }
};

/** Maps a Strapi-owned tool result onto the protocol shape the SDK transports. */
export const toSdkToolResult = (result: Modules.MCP.McpToolResult): CallToolResult => ({
  content: result.content.map(toSdkContentBlock),
  structuredContent: result.structuredContent,
  isError: result.isError,
});

/** Maps a Strapi-owned prompt result onto the protocol shape the SDK transports. */
export const toSdkPromptResult = (result: Modules.MCP.McpPromptResult): GetPromptResult => {
  const { description, messages, _meta, ...extensionFields } = result;

  return {
    ...extensionFields,
    description,
    messages: messages.map((message) => ({
      role: message.role,
      content: toSdkContentBlock(message.content),
    })),
    _meta: toSdkResultMetadata(_meta),
  };
};

/** Maps a Strapi-owned resource read result onto the protocol shape the SDK transports. */
export const toSdkResourceReadResult = (
  result: Modules.MCP.McpResourceReadResult
): ReadResourceResult => {
  const { contents, _meta, ...extensionFields } = result;

  return {
    ...extensionFields,
    contents: contents.map(toSdkResourceContents),
    _meta: toSdkResultMetadata(_meta),
  };
};

/** Maps Strapi-owned resource listing metadata onto the shape the SDK advertises. */
export const toSdkResourceListingMetadata = (
  metadata: Modules.MCP.McpResourceListingMetadata
): ResourceMetadata => {
  const { title, description, mimeType, size, icons, annotations, _meta } = metadata;

  return { title, description, mimeType, size, icons, annotations, _meta };
};
