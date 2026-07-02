export type McpCapabilityType = 'tool' | 'prompt' | 'resource';

export type McpCapabilityIdentity = {
  type: McpCapabilityType;
  source: string;
  name: string;
};

export const normalizeMcpCapability = (
  type: McpCapabilityType,
  rawName: string,
  telemetry?: { source?: string; name?: string }
): McpCapabilityIdentity => ({
  type,
  source: telemetry?.source ?? 'unknown',
  name: telemetry?.name ?? rawName,
});
