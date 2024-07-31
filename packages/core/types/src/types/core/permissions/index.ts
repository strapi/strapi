import type { engine } from '@strapi/permissions';

type PermissionRule = Parameters<engine.abilities.CustomAbilityBuilder['can']>[0];
type ParametrizedAction = Parameters<
  engine.abilities.CustomAbilityBuilder['buildParametrizedAction']
>[0];

export type { PermissionRule, ParametrizedAction };
