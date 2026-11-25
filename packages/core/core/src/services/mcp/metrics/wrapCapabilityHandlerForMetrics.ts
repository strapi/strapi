import type { Core, Modules } from '@strapi/types';

import { normalizeMcpCapability, type McpCapabilityType } from './normalizeMcpCapability';
import { sendDidExecuteMcpCapability, sendDidNotExecuteMcpCapability } from './metrics';

const isCapabilityFailure = (result: unknown): boolean => {
  if (result === null || typeof result !== 'object') {
    return false;
  }

  return 'isError' in result && result.isError === true;
};

export const wrapCapabilityHandlerForMetrics = <
  THandler extends (...args: never[]) => Promise<unknown>,
>(
  strapi: Core.Strapi,
  type: McpCapabilityType,
  capabilityName: string,
  telemetry: Modules.MCP.McpCapabilityTelemetry | undefined,
  handler: THandler
): THandler => {
  const wrapped = async (...args: Parameters<THandler>) => {
    const result = await handler(...args);
    const identity = normalizeMcpCapability(type, capabilityName, telemetry);

    if (isCapabilityFailure(result)) {
      sendDidNotExecuteMcpCapability(strapi, identity, 'execution_error');
    } else {
      sendDidExecuteMcpCapability(strapi, identity);
    }

    return result;
  };

  return wrapped as THandler;
};
