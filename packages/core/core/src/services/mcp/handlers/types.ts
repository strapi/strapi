import type { Core } from '@strapi/types';
import type { McpConfiguration } from '../internal/McpConfiguration';
import type {
  McpCapabilityDefinitions,
  createMcpServerWithRegistries,
} from '../internal/McpServerFactory';
import type { McpSessionManager } from '../internal/McpSessionManager';

export type McpHandlerDependencies = {
  strapi: Core.Strapi;
  sessionManager: McpSessionManager;
  config: McpConfiguration;
  createServerWithRegistries: typeof createMcpServerWithRegistries;
  capabilityDefinitions: McpCapabilityDefinitions;
};
