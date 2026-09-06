import type { Core } from '@strapi/types';

import type { McpCapabilityIdentity } from './normalizeMcpCapability';

/** Rate-limited via core telemetry `LIMITED_EVENTS`. */
export const MCP_LIMITED_TELEMETRY_EVENTS = {
  didStartMcpServer: 'didStartMcpServer',
  didUseMcpServer: 'didUseMcpServer',
  didNotAuthenticateMcpRequest: 'didNotAuthenticateMcpRequest',
  didNotHandleMcpRequest: 'didNotHandleMcpRequest',
} as const;

export type McpLimitedTelemetryEvent =
  (typeof MCP_LIMITED_TELEMETRY_EVENTS)[keyof typeof MCP_LIMITED_TELEMETRY_EVENTS];

export type McpAuthErrorClass = 'missing_token' | 'invalid_token';
export type McpRequestErrorClass = 'timeout' | 'error';
export type McpCapabilityErrorClass = 'execution_error';

export type McpStartTelemetryProperties = {
  path: string;
  numberOfTools: number;
  numberOfPrompts: number;
  numberOfResources: number;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let capabilityCacheExpiresAt = Date.now() + ONE_DAY_MS;
const executedCapabilities = new Set<string>();
const failedCapabilities = new Set<string>();

const capabilityCacheKey = (identity: McpCapabilityIdentity, succeeded: boolean): string =>
  `${succeeded ? 'execute' : 'notExecute'}:${identity.type}:${identity.source}:${identity.name}`;

/** Resets in-memory capability metrics state (unit tests only). */
export const resetMcpMetricsStateForTests = (): void => {
  executedCapabilities.clear();
  failedCapabilities.clear();
  capabilityCacheExpiresAt = Date.now() + ONE_DAY_MS;
};

const shouldSendCapabilityEvent = (
  identity: McpCapabilityIdentity,
  succeeded: boolean
): boolean => {
  const cache = succeeded ? executedCapabilities : failedCapabilities;

  if (Date.now() > capabilityCacheExpiresAt) {
    executedCapabilities.clear();
    failedCapabilities.clear();
    capabilityCacheExpiresAt = Date.now() + ONE_DAY_MS;
  }

  const key = capabilityCacheKey(identity, succeeded);

  if (cache.has(key)) {
    return false;
  }

  cache.add(key);
  return true;
};

export const classifyMcpRequestFailure = (error: unknown): McpRequestErrorClass => {
  if (error instanceof Error && error.message.includes('timed out')) {
    return 'timeout';
  }

  return 'error';
};

export const sendDidStartMcpServer = (
  strapi: Core.Strapi,
  properties: McpStartTelemetryProperties
): void => {
  strapi.telemetry
    .send(MCP_LIMITED_TELEMETRY_EVENTS.didStartMcpServer, {
      eventProperties: { path: properties.path },
      groupProperties: {
        numberOfTools: properties.numberOfTools,
        numberOfPrompts: properties.numberOfPrompts,
        numberOfResources: properties.numberOfResources,
      },
    })
    .catch(() => {});
};

export const sendDidUseMcpServer = (strapi: Core.Strapi): void => {
  strapi.telemetry.send(MCP_LIMITED_TELEMETRY_EVENTS.didUseMcpServer).catch(() => {});
};

export const sendDidNotAuthenticateMcpRequest = (
  strapi: Core.Strapi,
  errorClass: McpAuthErrorClass
): void => {
  strapi.telemetry
    .send(MCP_LIMITED_TELEMETRY_EVENTS.didNotAuthenticateMcpRequest, {
      eventProperties: { errorClass },
    })
    .catch(() => {});
};

export const sendDidNotHandleMcpRequest = (
  strapi: Core.Strapi,
  errorClass: McpRequestErrorClass
): void => {
  strapi.telemetry
    .send(MCP_LIMITED_TELEMETRY_EVENTS.didNotHandleMcpRequest, {
      eventProperties: { errorClass },
    })
    .catch(() => {});
};

export const sendDidExecuteMcpCapability = (
  strapi: Core.Strapi,
  identity: McpCapabilityIdentity
): void => {
  if (!shouldSendCapabilityEvent(identity, true)) {
    return;
  }

  strapi.telemetry
    .send('didExecuteMcpCapability', {
      eventProperties: {
        type: identity.type,
        source: identity.source,
        name: identity.name,
      },
    })
    .catch(() => {});
};

export const sendDidNotExecuteMcpCapability = (
  strapi: Core.Strapi,
  identity: McpCapabilityIdentity,
  errorClass: McpCapabilityErrorClass
): void => {
  if (!shouldSendCapabilityEvent(identity, false)) {
    return;
  }

  strapi.telemetry
    .send('didNotExecuteMcpCapability', {
      eventProperties: {
        type: identity.type,
        source: identity.source,
        name: identity.name,
        errorClass,
      },
    })
    .catch(() => {});
};
