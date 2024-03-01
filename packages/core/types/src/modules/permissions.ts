import type { Subject } from '@casl/ability';

export interface ParametrizedAction {
  name: string;
  params: Record<string, unknown>;
}
export interface PermissionRule {
  action: string | ParametrizedAction;
  subject?: Subject | null;
  properties?: {
    fields?: string[];
  };
  condition?: Record<string, unknown>;
}
