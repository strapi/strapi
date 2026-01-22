import type { ServerResponse } from 'node:http';

export const sendJsonRpcError = (
  res: ServerResponse,
  httpStatus: number,
  code: number,
  message: string
): void => {
  if (res.headersSent === false) {
    res.writeHead(httpStatus, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code, message },
        id: null,
      })
    );
  }
};
