import type { Modules } from '@strapi/types';
import type { McpAdminTokenAbility } from '../authentication';
import type { McpCapabilityDefinitions, McpRegistries } from './McpServerFactory';

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
  registries: McpRegistries;
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
  registries,
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
    const status = registries.tools.status(definition.name);

    if (status === 'disabled' && allowed === true) {
      registries.tools.enable(definition.name);
      summary.enabled.push(definition.name);
    }

    if (status === 'enabled' && allowed === false) {
      registries.tools.disable(definition.name);
      summary.disabled.push(definition.name);
    }
  });

  definitions.prompts.forEach((definition) => {
    const allowed = canUseMcpCapability({ ability, definition, isDevMode });
    const status = registries.prompts.status(definition.name);

    if (status === 'disabled' && allowed === true) {
      registries.prompts.enable(definition.name);
      summary.enabled.push(definition.name);
    }

    if (status === 'enabled' && allowed === false) {
      registries.prompts.disable(definition.name);
      summary.disabled.push(definition.name);
    }
  });

  definitions.resources.forEach((definition) => {
    const allowed = canUseMcpCapability({ ability, definition, isDevMode });
    const status = registries.resources.status(definition.name);

    if (status === 'disabled' && allowed === true) {
      registries.resources.enable(definition.name);
      summary.enabled.push(definition.name);
    }

    if (status === 'enabled' && allowed === false) {
      registries.resources.disable(definition.name);
      summary.disabled.push(definition.name);
    }
  });

  return summary;
};
