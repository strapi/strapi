import { ServerResponse } from 'node:http';
import { sendJsonRpcError } from '../sendJsonRpcError';

describe('sendJsonRpcError', () => {
  let mockResponse: Partial<ServerResponse>;
  let writeHeadSpy: jest.Mock;
  let endSpy: jest.Mock;

  beforeEach(() => {
    writeHeadSpy = jest.fn();
    endSpy = jest.fn();
    mockResponse = {
      headersSent: false,
      writeHead: writeHeadSpy,
      end: endSpy,
    };
  });

  test('should send JSON-RPC error response with correct format', () => {
    sendJsonRpcError(mockResponse as ServerResponse, 400, -32000, 'Invalid request');

    expect(writeHeadSpy).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
    expect(endSpy).toHaveBeenCalledWith(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Invalid request' },
        id: null,
      })
    );
  });

  test('should not send response if headers already sent', () => {
    mockResponse.headersSent = true;

    sendJsonRpcError(mockResponse as ServerResponse, 500, -32603, 'Internal error');

    expect(writeHeadSpy).not.toHaveBeenCalled();
    expect(endSpy).not.toHaveBeenCalled();
  });

  test('should handle different HTTP status codes', () => {
    sendJsonRpcError(mockResponse as ServerResponse, 503, -32001, 'Service unavailable');

    expect(writeHeadSpy).toHaveBeenCalledWith(503, { 'Content-Type': 'application/json' });
    expect(endSpy).toHaveBeenCalledWith(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Service unavailable' },
        id: null,
      })
    );
  });

  test('should handle different error codes', () => {
    sendJsonRpcError(mockResponse as ServerResponse, 400, -32700, 'Parse error');

    expect(endSpy).toHaveBeenCalledWith(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32700, message: 'Parse error' },
        id: null,
      })
    );
  });
});
