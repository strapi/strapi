import { ServerResponse } from 'node:http';
import { JSON_RPC_ERRORS } from '../../utils/jsonRpcErrors';
import { createGetHandler } from '../handleGet';

describe('handleGet', () => {
  const makeRes = () => {
    const writeHeadSpy = jest.fn();
    const endSpy = jest.fn();
    const res = {
      headersSent: false,
      writeHead: writeHeadSpy,
      end: endSpy,
    } as unknown as ServerResponse;
    return { res, writeHeadSpy, endSpy };
  };

  test('should return 405 Method Not Allowed', async () => {
    const handler = createGetHandler();
    const setSpy = jest.fn();
    const { res, writeHeadSpy } = makeRes();

    const ctx = { set: setSpy, res } as any;

    await handler(ctx, () => Promise.resolve());

    expect(setSpy).toHaveBeenCalledWith('Allow', 'POST');
    expect(writeHeadSpy).toHaveBeenCalledWith(JSON_RPC_ERRORS.METHOD_NOT_ALLOWED.httpStatus, {
      'Content-Type': 'application/json',
    });
  });

  test('should not require any authentication or session', async () => {
    const handler = createGetHandler();
    const setSpy = jest.fn();
    const { res, endSpy } = makeRes();

    const ctx = { set: setSpy, res } as any;

    await handler(ctx, () => Promise.resolve());

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
});
