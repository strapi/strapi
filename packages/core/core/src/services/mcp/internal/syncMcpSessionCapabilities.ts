import type { Modules } from '@strapi/types';
import type { McpAdminTokenAbility } from '../authentication';
import type { McpSession } from './McpSession';
import type { McpCapabilityDefinitions } from './McpServerFactory';

type CanUseAuthorizedCapabilityParams = {
  ability: McpAdminTokenAbility;
  auth: Modules.MCP.McpCapabilityAuth;
};

export type CanUseMcpCapabilityParams = {
  ability: McpAdminTokenAbility;
  definition: Modules.MCP.McpCapabilityDefinition;
  isDevMode: boolean;
};

export type SyncMcpSessionCapabilitiesParams = {
  session: Pick<McpSession, 'toolRegistry' | 'promptRegistry' | 'resourceRegistry'>;
  definitions: McpCapabilityDefinitions;
  ability: McpAdminTokenAbility;
  isDevMode: boolean;
};

export type SyncMcpSessionCapabilitiesSummary = {
  enabled: string[];
  disabled: string[];
};

const canUseAuthorizedCapability = ({
  ability,
  auth,
}: CanUseAuthorizedCapabilityParams): boolean => {
  if (auth.subject !== undefined) {
    return ability.can(auth.action, auth.subject);
  }

  return ability.can(auth.action);
};

export const canUseMcpCapability = ({
  ability,
  definition,
  isDevMode,
}: CanUseMcpCapabilityParams): boolean => {
  if (definition.devModeOnly === true) {
    return isDevMode === true;
  }

  if (definition.auth === undefined) {
    return false;
  }

  // Session capability availability is a coarse allowlist. Field/entity conditions must be
  // enforced by capability handlers with request-specific context.
  return canUseAuthorizedCapability({ ability, auth: definition.auth });
};

export const syncMcpSessionCapabilities = ({
  session,
  definitions,
  ability,
  isDevMode,
}: SyncMcpSessionCapabilitiesParams): SyncMcpSessionCapabilitiesSummary => {
  const summary: SyncMcpSessionCapabilitiesSummary = {
    enabled: [],
    disabled: [],
  };

  definitions.tools.forEach((definition) => {
    const allowed = canUseMcpCapability({ ability, definition, isDevMode });
    const status = session.toolRegistry.status(definition.name);

    if (status === 'disabled' && allowed === true) {
      session.toolRegistry.enable(definition.name);
      summary.enabled.push(definition.name);
    }

    if (status === 'enabled' && allowed === false) {
      session.toolRegistry.disable(definition.name);
      summary.disabled.push(definition.name);
    }
  });

  definitions.prompts.forEach((definition) => {
    const allowed = canUseMcpCapability({ ability, definition, isDevMode });
    const status = session.promptRegistry.status(definition.name);

    if (status === 'disabled' && allowed === true) {
      session.promptRegistry.enable(definition.name);
      summary.enabled.push(definition.name);
    }

    if (status === 'enabled' && allowed === false) {
      session.promptRegistry.disable(definition.name);
      summary.disabled.push(definition.name);
    }
  });

  definitions.resources.forEach((definition) => {
    const allowed = canUseMcpCapability({ ability, definition, isDevMode });
    const status = session.resourceRegistry.status(definition.name);

    if (status === 'disabled' && allowed === true) {
      session.resourceRegistry.enable(definition.name);
      summary.enabled.push(definition.name);
    }

    if (status === 'enabled' && allowed === false) {
      session.resourceRegistry.disable(definition.name);
      summary.disabled.push(definition.name);
    }
  });

  return summary;
};
