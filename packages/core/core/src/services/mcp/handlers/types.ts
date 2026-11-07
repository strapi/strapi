import type { Core } from '@strapi/types';
import type { McpConfiguration } from '../internal/McpConfiguration';
import type {
  McpCapabilityDefinitions,
  createMcpServerWithRegistries,
} from '../internal/McpServerFactory';
import type { McpAuthenticationStrategy } from '../authentication';

export type McpHandlerDependencies = {
  strapi: Core.Strapi;
  authenticationStrategy: McpAuthenticationStrategy;
  config: McpConfiguration;
  createServerWithRegistries: typeof createMcpServerWithRegistries;
  capabilityDefinitions: McpCapabilityDefinitions;
};
