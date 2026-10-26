import type { ServerContext } from '@modelcontextprotocol/server';
import type { Modules } from '@strapi/types';

/**
 * Translates the MCP SDK's request context into Strapi's public handler context.
 */
export const createMcpCapabilityHandlerContext = (
  context: ServerContext
): Modules.MCP.McpCapabilityHandlerContext => {
  const { _meta, envelope } = context.mcpReq;
  const request = context.http?.req;
  const headers: Record<string, string | string[] | undefined> = {};

  request?.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    signal: context.mcpReq.signal,
    requestId: context.mcpReq.id,
    sessionId: context.sessionId,
    authInfo: context.http?.authInfo,
    _meta:
      _meta === undefined && envelope === undefined
        ? undefined
        : {
            ..._meta,
            ...envelope,
          },
    requestInfo:
      request === undefined
        ? undefined
        : {
            headers,
            url: new URL(request.url),
          },
  };
};
