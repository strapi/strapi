import type { Core } from '@strapi/types';
import type { McpConfiguration } from '../internal/McpConfiguration';
import type {
  McpCapabilityDefinitions,
  createMcpServerWithRegistries,
} from '../internal/McpServerFactory';
import type { McpSessionManager } from '../internal/McpSessionManager';
import type { createAppTokenStrategy } from '../strategies/app-token';

export type McpHandlerDependencies = {
  strapi: Core.Strapi;
  authenticationStrategy: ReturnType<typeof createAppTokenStrategy>;
  sessionManager: McpSessionManager;
  config: McpConfiguration;
  createServerWithRegistries: typeof createMcpServerWithRegistries;
  capabilityDefinitions: McpCapabilityDefinitions;
};
