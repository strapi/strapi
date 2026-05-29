import type { Core } from '@strapi/types';
import type { RegisteredCapability } from '../internal/McpCapabilityRegistry';
import { wrapSafeHandler } from './safeHandlerWrapper';

/**
 * A no-op registered capability used as fallback when SDK registration fails.
 *
 * This prevents one broken capability from aborting the entire registration loop.
 * The capability will appear as "disabled" and cannot be enabled.
 */
export const FAILED_REGISTERED_CAPABILITY: RegisteredCapability = Object.freeze({
  enabled: false,
  enable() {},
  disable() {},
  remove() {},
});

/**
 * Configuration for creating a safe capability registration
 */
export type SafeCapabilityRegistrationConfig<THandler, TErrorResult, TRegistered> = {
  strapi: Core.Strapi;
  capabilityType: string;
  name: string;
  createHandler: (strapi: Core.Strapi) => THandler;
  createFallbackHandler: (errorMessage: string) => NoInfer<THandler>;
  createErrorResult: (error: Error, args: unknown[]) => TErrorResult;
  registerWithSdk: (safeHandler: THandler) => TRegistered;
};

/**
 * Creates a safe capability registration that protects Strapi core from user callback errors
 * at three levels:
 *
 * - Level 1: Catch factory invocation errors (createHandler throws)
 * - Level 2: Catch runtime execution errors (handler throws during invocation)
 * - Level 3: Catch MCP SDK registration errors (SDK rejects the registration)
 *
 * This prevents one broken capability from:
 * - Aborting the entire registration loop
 * - Crashing the MCP server
 * - Leaking unhandled errors to the user
 */
export const createSafeCapabilityRegistration = <THandler, TErrorResult, TRegistered>(
  config: SafeCapabilityRegistrationConfig<THandler, TErrorResult, TRegistered>
): TRegistered => {
  const {
    strapi,
    capabilityType,
    name,
    createHandler,
    createFallbackHandler,
    createErrorResult,
    registerWithSdk,
  } = config;

  try {
    // Level 1: Safe factory invocation — catch errors from user's createHandler
    let rawHandler: THandler;

    try {
      rawHandler = createHandler(strapi);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      strapi.log.error(
        `[MCP] ${capabilityType} "${name}" handler factory threw during initialization: ${message}`
      );

      // Substitute a fallback handler that always returns an error to the MCP client
      rawHandler = createFallbackHandler(message);
    }

    // Level 2: Safe runtime wrapping — catch errors from user's handler during execution
    const safeHandler = wrapSafeHandler(rawHandler as (...args: unknown[]) => Promise<unknown>, {
      strapi,
      capabilityType,
      name,
      createErrorResult,
    });

    return registerWithSdk(safeHandler as THandler);
  } catch (error) {
    // Level 3: Catch MCP SDK registration errors — prevent one broken capability from aborting all others
    const message = error instanceof Error ? error.message : String(error);
    strapi.log.error(
      `[MCP] Failed to register ${capabilityType.toLowerCase()} "${name}" with MCP server: ${message}`
    );
    return FAILED_REGISTERED_CAPABILITY as unknown as TRegistered;
  }
};
