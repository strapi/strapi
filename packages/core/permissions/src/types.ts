/**
 * These were imported from `@strapi/types` but if we do that
 * it becomes a circular dependency. This is the source of truth,
 * they're re-exported from `@strapi/types` for convenience.
 */
import type { Subject } from '@casl/ability';

export interface ParametrizedAction {
  name: string;
  params: Record<string, unknown>;
}
export interface PermissionRule {
  action: string | ParametrizedAction;
  subject?: Subject | null | undefined;
  properties?:
    | {
        fields?: string[];
      }
    | undefined;
  condition?: Record<string, unknown>;
}
