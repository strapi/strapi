import type { Core } from '@strapi/types';
import { createMcpMetrics } from '../metrics';

/**
 * Wraps an MCP capability handler to catch and log errors from user-provided callbacks.
 *
 * This prevents externally-registered capabilities (from plugin developers)
 * from crashing Strapi core when they throw during execution.
 *
 * Errors are:
 * - Logged with full detail (message + stack) via Strapi's logger
 * - Returned to the MCP client as a safe error response (no stack trace leak)
 */
export const wrapSafeHandler = <TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => Promise<TResult>,
  options: {
    strapi: Core.Strapi;
    capabilityType: string;
    name: string;
    createErrorResult: (error: Error, args: TArgs) => TResult;
  }
): ((...args: TArgs) => Promise<TResult>) => {
  const { strapi, capabilityType, name, createErrorResult } = options;

  return async (...args: TArgs): Promise<TResult> => {
    try {
      const result = await handler(...args);
      createMcpMetrics(strapi).send('didExecuteMcpCapability', {
        capabilityName: name,
        capabilityType,
      });
      return result;
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));

      createMcpMetrics(strapi).send('didNotExecuteMcpCapability', {
        capabilityName: name,
        capabilityType,
        errorClass: normalized.constructor.name,
      });

      strapi.log.error(
        `[MCP] ${capabilityType} "${name}" threw an error during execution: ${normalized.message}`,
        {
          error: normalized.message,
          stack: normalized.stack,
        }
      );

      return createErrorResult(normalized, args);
    }
  };
};
