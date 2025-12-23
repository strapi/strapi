import type { IncomingMessage } from 'node:http';

export const extractSessionId = (req: IncomingMessage): string | undefined => {
  const maybeSessionId = req.headers['mcp-session-id'];
  if (typeof maybeSessionId === 'string' && maybeSessionId.length !== 0) {
    return maybeSessionId;
  }
  return undefined;
};
