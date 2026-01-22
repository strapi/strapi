import { wrapSafeHandler } from '../safeHandlerWrapper';

const createMockStrapi = () =>
  ({
    log: {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    },
  }) as any;

describe('wrapSafeHandler', () => {
  describe('when the handler succeeds', () => {
    test('returns the handler result as-is', async () => {
      const strapi = createMockStrapi();
      const handler = jest.fn().mockResolvedValue({ content: 'ok' });

      const safe = wrapSafeHandler(handler, {
        strapi,
        capabilityType: 'Tool',
        name: 'my-tool',
        createErrorResult: () => ({ content: 'error' }),
      });

      const result = await safe('arg1', 'arg2');

      expect(result).toEqual({ content: 'ok' });
      expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
      expect(strapi.log.error).not.toHaveBeenCalled();
    });

    test('passes through all arguments to the original handler', async () => {
      const strapi = createMockStrapi();
      const handler = jest.fn().mockResolvedValue('result');

      const safe = wrapSafeHandler(handler, {
        strapi,
        capabilityType: 'Prompt',
        name: 'my-prompt',
        createErrorResult: () => 'error',
      });

      await safe('a', 'b', 'c');

      expect(handler).toHaveBeenCalledWith('a', 'b', 'c');
    });
  });

  describe('when the handler throws an Error', () => {
    test('catches the error and returns the error result', async () => {
      const strapi = createMockStrapi();
      const handler = jest.fn().mockRejectedValue(new Error('something broke'));

      const safe = wrapSafeHandler(handler, {
        strapi,
        capabilityType: 'Tool',
        name: 'bad-tool',
        createErrorResult: (error) => ({ errorMessage: error.message }),
      });

      const result = await safe();

      expect(result).toEqual({ errorMessage: 'something broke' });
    });

    test('logs the error with full detail via strapi logger', async () => {
      const strapi = createMockStrapi();
      const error = new Error('db connection lost');
      const handler = jest.fn().mockRejectedValue(error);

      const safe = wrapSafeHandler(handler, {
        strapi,
        capabilityType: 'Resource',
        name: 'my-resource',
        createErrorResult: () => 'fallback',
      });

      await safe();

      expect(strapi.log.error).toHaveBeenCalledWith(
        '[MCP] Resource "my-resource" threw an error during execution',
        {
          error: 'db connection lost',
          stack: error.stack,
        }
      );
    });
  });

  describe('when the handler throws a non-Error value', () => {
    test('normalizes a string throw into an Error', async () => {
      const strapi = createMockStrapi();
      const handler = jest.fn().mockRejectedValue('raw string error');

      const safe = wrapSafeHandler(handler, {
        strapi,
        capabilityType: 'Tool',
        name: 'string-throw',
        createErrorResult: (error) => ({ msg: error.message }),
      });

      const result = await safe();

      expect(result).toEqual({ msg: 'raw string error' });
      expect(strapi.log.error).toHaveBeenCalledWith(
        '[MCP] Tool "string-throw" threw an error during execution',
        expect.objectContaining({ error: 'raw string error' })
      );
    });

    test('normalizes a number throw into an Error', async () => {
      const strapi = createMockStrapi();
      const handler = jest.fn().mockRejectedValue(42);

      const safe = wrapSafeHandler(handler, {
        strapi,
        capabilityType: 'Prompt',
        name: 'number-throw',
        createErrorResult: (error) => ({ msg: error.message }),
      });

      const result = await safe();

      expect(result).toEqual({ msg: '42' });
    });

    test('normalizes undefined throw into an Error', async () => {
      const strapi = createMockStrapi();
      const handler = jest.fn().mockRejectedValue(undefined);

      const safe = wrapSafeHandler(handler, {
        strapi,
        capabilityType: 'Tool',
        name: 'undefined-throw',
        createErrorResult: (error) => ({ msg: error.message }),
      });

      const result = await safe();

      expect(result).toEqual({ msg: 'undefined' });
    });
  });

  describe('when the handler throws synchronously', () => {
    test('catches synchronous errors', async () => {
      const strapi = createMockStrapi();
      const handler = jest.fn().mockImplementation(() => {
        throw new Error('sync explosion');
      });

      const safe = wrapSafeHandler(handler, {
        strapi,
        capabilityType: 'Tool',
        name: 'sync-throw',
        createErrorResult: (error) => ({ msg: error.message }),
      });

      const result = await safe();

      expect(result).toEqual({ msg: 'sync explosion' });
      expect(strapi.log.error).toHaveBeenCalled();
    });
  });

  describe('createErrorResult receives args', () => {
    test('passes the original call args to createErrorResult', async () => {
      const strapi = createMockStrapi();
      const handler = jest.fn().mockRejectedValue(new Error('fail'));

      const createErrorResult = jest.fn().mockReturnValue('error');

      const safe = wrapSafeHandler(handler, {
        strapi,
        capabilityType: 'Resource',
        name: 'res',
        createErrorResult,
      });

      const fakeUri = new URL('https://example.com/resource');
      await safe(fakeUri, { extra: true });

      expect(createErrorResult).toHaveBeenCalledWith(expect.any(Error), [fakeUri, { extra: true }]);
    });
  });
});
