import {
  createSafeCapabilityRegistration,
  FAILED_REGISTERED_CAPABILITY,
} from '../createSafeCapabilityRegistration';

const createMockStrapi = () =>
  ({
    log: {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    },
  }) as any;

describe('createSafeCapabilityRegistration', () => {
  describe('when all handlers succeed', () => {
    test('creates handler, wraps it safely, and registers with SDK', () => {
      const strapi = createMockStrapi();
      const mockHandler = jest.fn().mockResolvedValue({ result: 'ok' });
      const createHandler = jest.fn().mockReturnValue(mockHandler);
      const registerWithSdk = jest.fn().mockReturnValue({ registered: true });

      const result = createSafeCapabilityRegistration({
        strapi,
        capabilityType: 'Tool',
        name: 'my-tool',
        createHandler,
        createFallbackHandler: jest.fn(),
        createErrorResult: jest.fn(),
        registerWithSdk,
      });

      expect(createHandler).toHaveBeenCalledWith(strapi);
      expect(registerWithSdk).toHaveBeenCalled();
      expect(result).toEqual({ registered: true });
      expect(strapi.log.error).not.toHaveBeenCalled();
    });
  });

  describe('Level 1: createHandler throws during factory invocation', () => {
    test('catches error, logs it, and uses fallback handler', () => {
      const strapi = createMockStrapi();
      const createHandler = jest.fn().mockImplementation(() => {
        throw new Error('factory explosion');
      });
      const fallbackHandler = jest.fn().mockResolvedValue({ fallback: true });
      const createFallbackHandler = jest.fn().mockReturnValue(fallbackHandler);
      const registerWithSdk = jest.fn().mockReturnValue({ registered: true });

      const result = createSafeCapabilityRegistration({
        strapi,
        capabilityType: 'Prompt',
        name: 'my-prompt',
        createHandler,
        createFallbackHandler,
        createErrorResult: jest.fn(),
        registerWithSdk,
      });

      expect(strapi.log.error).toHaveBeenCalledWith(
        '[MCP] Prompt "my-prompt" handler factory threw during initialization: factory explosion'
      );
      expect(createFallbackHandler).toHaveBeenCalledWith('factory explosion');
      expect(registerWithSdk).toHaveBeenCalled();
      expect(result).toEqual({ registered: true });
    });

    test('handles non-Error throws', () => {
      const strapi = createMockStrapi();
      const createHandler = jest.fn().mockImplementation(() => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'string error';
      });
      const createFallbackHandler = jest.fn().mockReturnValue(jest.fn());
      const registerWithSdk = jest.fn().mockReturnValue({ registered: true });

      createSafeCapabilityRegistration({
        strapi,
        capabilityType: 'Resource',
        name: 'my-resource',
        createHandler,
        createFallbackHandler,
        createErrorResult: jest.fn(),
        registerWithSdk,
      });

      expect(createFallbackHandler).toHaveBeenCalledWith('string error');
    });
  });

  describe('Level 2: handler throws during runtime execution', () => {
    test('wraps handler and catches runtime errors', async () => {
      const strapi = createMockStrapi();
      const mockHandler = jest.fn().mockRejectedValue(new Error('runtime boom'));
      const createHandler = jest.fn().mockReturnValue(mockHandler);
      const createErrorResult = jest.fn().mockReturnValue({ error: 'handled' });
      let capturedSafeHandler: (...args: any[]) => any;
      const registerWithSdk = jest.fn().mockImplementation((handler) => {
        capturedSafeHandler = handler;
        return { registered: true };
      });

      createSafeCapabilityRegistration({
        strapi,
        capabilityType: 'Tool',
        name: 'fail-tool',
        createHandler,
        createFallbackHandler: jest.fn(),
        createErrorResult,
        registerWithSdk,
      });

      // Execute the wrapped handler that was registered
      const result = await capturedSafeHandler!('arg1', 'arg2');

      expect(result).toEqual({ error: 'handled' });
      expect(createErrorResult).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'runtime boom' }),
        ['arg1', 'arg2']
      );
      expect(strapi.log.error).toHaveBeenCalledWith(
        '[MCP] Tool "fail-tool" threw an error during execution',
        expect.objectContaining({ error: 'runtime boom' })
      );
    });
  });

  describe('Level 3: SDK registration throws', () => {
    test('catches SDK error, logs it, and returns FAILED_REGISTERED_CAPABILITY', () => {
      const strapi = createMockStrapi();
      const registerWithSdk = jest.fn().mockImplementation(() => {
        throw new Error('SDK rejected registration');
      });

      const result = createSafeCapabilityRegistration({
        strapi,
        capabilityType: 'Prompt',
        name: 'bad-prompt',
        createHandler: jest.fn().mockReturnValue(jest.fn()),
        createFallbackHandler: jest.fn(),
        createErrorResult: jest.fn(),
        registerWithSdk,
      });

      expect(strapi.log.error).toHaveBeenCalledWith(
        '[MCP] Failed to register prompt "bad-prompt" with MCP server: SDK rejected registration'
      );
      expect(result).toEqual({
        enabled: false,
        enable: expect.any(Function),
        disable: expect.any(Function),
        remove: expect.any(Function),
      });
    });

    test('FAILED_REGISTERED_CAPABILITY methods are no-ops', () => {
      const strapi = createMockStrapi();
      const registerWithSdk = jest.fn().mockImplementation(() => {
        throw new Error('rejection');
      });

      const result = createSafeCapabilityRegistration({
        strapi,
        capabilityType: 'Tool',
        name: 'rejected-tool',
        createHandler: jest.fn().mockReturnValue(jest.fn()),
        createFallbackHandler: jest.fn(),
        createErrorResult: jest.fn(),
        registerWithSdk,
      });

      // These should not throw
      expect(() => result.enable()).not.toThrow();
      expect(() => result.disable()).not.toThrow();
      expect(() => result.remove()).not.toThrow();
      expect(result.enabled).toBe(false);
    });
  });

  describe('integration: all three levels protect independently', () => {
    test('Level 1 error does not prevent Level 2 wrapping', async () => {
      const strapi = createMockStrapi();
      const createHandler = jest.fn().mockImplementation(() => {
        throw new Error('factory fail');
      });
      const fallbackHandler = jest.fn().mockRejectedValue(new Error('fallback fail'));
      const createFallbackHandler = jest.fn().mockReturnValue(fallbackHandler);
      const createErrorResult = jest.fn().mockReturnValue({ error: 'from level 2' });
      let capturedSafeHandler: (...args: any[]) => any;
      const registerWithSdk = jest.fn().mockImplementation((handler) => {
        capturedSafeHandler = handler;
        return { registered: true };
      });

      createSafeCapabilityRegistration({
        strapi,
        capabilityType: 'Tool',
        name: 'cascade-tool',
        createHandler,
        createFallbackHandler,
        createErrorResult,
        registerWithSdk,
      });

      // Even though the fallback handler fails, Level 2 should catch it
      const result = await capturedSafeHandler!();

      expect(result).toEqual({ error: 'from level 2' });
      expect(strapi.log.error).toHaveBeenCalledTimes(2); // Once for Level 1, once for Level 2
    });
  });
});

describe('FAILED_REGISTERED_CAPABILITY', () => {
  test('has enabled set to false', () => {
    expect(FAILED_REGISTERED_CAPABILITY.enabled).toBe(false);
  });

  test('enable/disable/remove are no-ops that do not throw', () => {
    expect(() => FAILED_REGISTERED_CAPABILITY.enable()).not.toThrow();
    expect(() => FAILED_REGISTERED_CAPABILITY.disable()).not.toThrow();
    expect(() => FAILED_REGISTERED_CAPABILITY.remove()).not.toThrow();
  });

  test('is frozen (immutable)', () => {
    expect(Object.isFrozen(FAILED_REGISTERED_CAPABILITY)).toBe(true);
  });
});
