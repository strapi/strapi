/**
 * Tools whose input/output schemas a request needs.
 *
 * - `'all'`: every tool may be advertised (e.g. `tools/list`).
 * - a set: only these tools may be invoked (`tools/call`); every other tool can skip schema
 *   resolution because the request never lists nor calls it.
 */
export type McpToolSchemaScope = 'all' | ReadonlySet<string>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Array.isArray(value) === false;

/**
 * Derives the tool schema scope from a JSON-RPC POST body (a single message or a batch).
 *
 * The server is stateless and rebuilt for every POST, so the body is the full set of work the
 * server will do. Unknown shapes fall back to `'all'` so the SDK keeps producing its own errors.
 */
export const resolveToolSchemaScope = (body: unknown): McpToolSchemaScope => {
  const messages = Array.isArray(body) ? body : [body];
  const toolNames = new Set<string>();

  for (const message of messages) {
    if (isRecord(message) === false) {
      return 'all';
    }

    // Responses and notifications carry no method or a method that never touches tools.
    if (message.method === 'tools/list') {
      return 'all';
    }

    if (message.method === 'tools/call') {
      const params = message.params;
      if (isRecord(params) === false || typeof params.name !== 'string') {
        return 'all';
      }
      toolNames.add(params.name);
    }
  }

  return toolNames;
};
