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
    sendJsonRpcError(mockResponse as ServerResponse, 'AUTHENTICATION_REQUIRED', 'Invalid request');

    expect(writeHeadSpy).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
    expect(endSpy).toHaveBeenCalledWith(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: JSON_RPC_ERRORS.AUTHENTICATION_REQUIRED.code, message: 'Invalid request' },
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
    sendJsonRpcError(mockResponse as ServerResponse, 'METHOD_NOT_ALLOWED');

    expect(writeHeadSpy).toHaveBeenCalledWith(405, { 'Content-Type': 'application/json' });
    expect(endSpy).toHaveBeenCalledWith(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: JSON_RPC_ERRORS.METHOD_NOT_ALLOWED.code,
          message: JSON_RPC_ERRORS.METHOD_NOT_ALLOWED.message,
        },
        id: null,
      })
    );
  });

  test('should override catalog message when custom message is provided', () => {
    sendJsonRpcError(mockResponse as ServerResponse, 'AUTHENTICATION_REQUIRED', 'Token expired');

    expect(writeHeadSpy).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' });
    expect(endSpy).toHaveBeenCalledWith(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: JSON_RPC_ERRORS.AUTHENTICATION_REQUIRED.code, message: 'Token expired' },
        id: null,
      })
    );
  });
});
