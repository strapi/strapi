import type { Core } from '@strapi/types';
import { McpConfiguration } from './internal/McpConfiguration';
import { sendJsonRpcError } from './utils/sendJsonRpcError';

/**
 * Handler for unsupported HTTP methods on /mcp endpoint.
 * Returns JSON-RPC error instead of plain text so MCP clients can parse it.
 */
const handleMethodNotAllowed: Core.MiddlewareHandler = async (ctx) => {
  // Opt out of Koa's response phase — sendJsonRpcError writes directly to ctx.res.
  ctx.respond = false;
  // ctx.set() writes to Koa's in-memory headers which are never flushed when ctx.respond = false.
  // Use res.setHeader() so the header is included when sendJsonRpcError calls res.writeHead().
  ctx.res.setHeader('Allow', 'POST');
  sendJsonRpcError(ctx.res, 'METHOD_NOT_ALLOWED');
};

export type McpRouteHandlers = {
  handlePost: Core.MiddlewareHandler;
};

/**
 * Creates MCP route definitions for registration with Strapi server.
 * @internal
 */
export const createMcpRoutes = (
  config: McpConfiguration,
  handlers: McpRouteHandlers
): Omit<Core.Route, 'info'>[] => {
  const noAuth = { auth: false } as const;

  return [
    { method: 'POST', path: config.path, handler: handlers.handlePost, config: noAuth },
    { method: 'GET', path: config.path, handler: handleMethodNotAllowed, config: noAuth },
    { method: 'DELETE', path: config.path, handler: handleMethodNotAllowed, config: noAuth },
    { method: 'PUT', path: config.path, handler: handleMethodNotAllowed, config: noAuth },
    { method: 'PATCH', path: config.path, handler: handleMethodNotAllowed, config: noAuth },
  ];
};
