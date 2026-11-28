import type { Core } from '@strapi/types';
import type { McpOAuthConfiguration } from '../configuration';
import type { McpOAuthClientStore } from '../services/client-store';
import type { McpOAuthCodeStore } from '../services/code-store';
import type { McpGrantSessionService } from '../services/grant-session';

export interface McpOAuthHandlerDependencies {
  strapi: Core.Strapi;
  config: McpOAuthConfiguration;
  clientStore: McpOAuthClientStore;
  codeStore: McpOAuthCodeStore;
  grantSessions: McpGrantSessionService;
}
