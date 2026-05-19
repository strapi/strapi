import { ServerResponse } from 'node:http';
import { JSON_RPC_ERRORS } from '../jsonRpcErrors';
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
    sendJsonRpcError(mockResponse as ServerResponse, 'INVALID_SESSION', 'Invalid request');

    expect(writeHeadSpy).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
    expect(endSpy).toHaveBeenCalledWith(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: JSON_RPC_ERRORS.INVALID_SESSION.code, message: 'Invalid request' },
        id: null,
      })
    );
  });

  test('should not send response if headers already sent', () => {
    // @ts-expect-error - we want to test the behavior when headers are already sent
    mockResponse.headersSent = true;

    sendJsonRpcError(mockResponse as ServerResponse, 'INTERNAL_ERROR');

    expect(writeHeadSpy).not.toHaveBeenCalled();
    expect(endSpy).not.toHaveBeenCalled();
  });

  test('should use default message from catalog when custom message is not provided', () => {
    sendJsonRpcError(mockResponse as ServerResponse, 'MAX_SESSIONS_REACHED');

    expect(writeHeadSpy).toHaveBeenCalledWith(503, { 'Content-Type': 'application/json' });
    expect(endSpy).toHaveBeenCalledWith(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: JSON_RPC_ERRORS.MAX_SESSIONS_REACHED.code,
          message: JSON_RPC_ERRORS.MAX_SESSIONS_REACHED.message,
        },
        id: null,
      })
    );
  });

  test('should override catalog message when custom message is provided', () => {
    sendJsonRpcError(mockResponse as ServerResponse, 'SESSION_REQUIRED', 'Session ID required');

    expect(writeHeadSpy).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
    expect(endSpy).toHaveBeenCalledWith(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: JSON_RPC_ERRORS.SESSION_REQUIRED.code, message: 'Session ID required' },
        id: null,
      })
    );
  });
});
