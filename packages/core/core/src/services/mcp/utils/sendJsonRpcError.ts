import type { ServerResponse } from 'node:http';
import { JSON_RPC_ERRORS } from './jsonRpcErrors';

export const sendJsonRpcError = (
  res: ServerResponse,
  errorKey: keyof typeof JSON_RPC_ERRORS,
  customMessage?: string
): void => {
  if (res.headersSent === false) {
    const { code, message, httpStatus } = JSON_RPC_ERRORS[errorKey];

    res.writeHead(httpStatus, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code, message: customMessage ?? message },
        id: null,
      })
    );
  }
};
