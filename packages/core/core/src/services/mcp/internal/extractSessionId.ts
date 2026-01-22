import type { IncomingMessage } from 'node:http';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_LENGTH = 36;

function isValidUUID(str: string): boolean {
  return str.length === UUID_LENGTH && UUID_REGEX.test(str);
}

export const extractSessionId = (req: IncomingMessage): string | undefined => {
  const maybeSessionId = req.headers['mcp-session-id'];
  if (typeof maybeSessionId === 'string' && maybeSessionId.length !== 0) {
    if (isValidUUID(maybeSessionId) === true) {
      return maybeSessionId;
    }
    return undefined;
  }
  return undefined;
};
