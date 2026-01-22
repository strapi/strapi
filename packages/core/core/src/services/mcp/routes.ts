import type { Core } from '@strapi/types';
import { McpConfiguration } from './internal/McpConfiguration';

/**
 * Handler for unsupported HTTP methods on /mcp endpoint.
 * Returns JSON-RPC error instead of plain text so MCP clients can parse it.
 */
const handleMethodNotAllowed: Core.MiddlewareHandler = async (ctx) => {
  ctx.status = 405;
  ctx.set('Allow', 'GET, POST, DELETE');
  ctx.set('Content-Type', 'application/json');
  ctx.body = {
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed' },
    id: null,
  };
};
/**
 * Handler for OAuth discovery endpoints.
 * Returns JSON 404 so MCP clients skip OAuth and use Bearer token auth.
 */
const handleOAuthNotSupported: Core.MiddlewareHandler = async (ctx) => {
  ctx.status = 404;
  ctx.set('Content-Type', 'application/json');
  ctx.body = { error: 'not_found', error_description: 'OAuth not supported' };
};

export type McpRouteHandlers = {
  handlePost: Core.MiddlewareHandler;
  handleGet: Core.MiddlewareHandler;
  handleDelete: Core.MiddlewareHandler;
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
    // Core MCP endpoints
    { method: 'POST', path: config.path, handler: handlers.handlePost, config: noAuth },
    { method: 'GET', path: config.path, handler: handlers.handleGet, config: noAuth },
    { method: 'DELETE', path: config.path, handler: handlers.handleDelete, config: noAuth },
    // Unsupported methods on /mcp - return JSON error for MCP client compatibility
    { method: 'PUT', path: config.path, handler: handleMethodNotAllowed, config: noAuth },
    { method: 'PATCH', path: config.path, handler: handleMethodNotAllowed, config: noAuth },
    // OAuth discovery endpoints - return 404 JSON so clients fall back to Bearer auth
    {
      method: 'GET',
      path: '/.well-known/oauth-authorization-server',
      handler: handleOAuthNotSupported,
      config: noAuth,
    },
    {
      method: 'POST',
      path: '/.well-known/oauth-authorization-server',
      handler: handleOAuthNotSupported,
      config: noAuth,
    },
    {
      method: 'PUT',
      path: '/.well-known/oauth-authorization-server',
      handler: handleOAuthNotSupported,
      config: noAuth,
    },
    {
      method: 'DELETE',
      path: '/.well-known/oauth-authorization-server',
      handler: handleOAuthNotSupported,
      config: noAuth,
    },
    {
      method: 'PATCH',
      path: '/.well-known/oauth-authorization-server',
      handler: handleOAuthNotSupported,
      config: noAuth,
    },
    /**
     * OAuth Dynamic Client Registration endpoint (RFC 7591).
     * Claude Code's MCP client probes this endpoint; without a JSON response,
     * Strapi returns plain text "Method Not Allowed" which breaks the client.
     */
    { method: 'POST', path: '/register', handler: handleOAuthNotSupported, config: noAuth },
  ];
};
