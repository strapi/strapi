import type { Core } from '@strapi/types';

export const createMcpMetrics = (strapi: Core.Strapi) => ({
  send(event: string, eventProperties?: Record<string, unknown>): void {
    strapi.telemetry
      .send(event, eventProperties !== undefined ? { eventProperties } : undefined)
      .catch(() => {});
  },
});

export type McpMetrics = ReturnType<typeof createMcpMetrics>;
