// @parity-settings: strict
// Strict-off parity for policies, with the `strict` compiler option only: these diagnostics depend
// on it (function parameter variance).
import type { Core } from '@strapi/strapi';

// A config-specific policy is not a `Core.Policy`.
const hasRole: Core.PolicyHandler<{ role: string }> = (ctx, config) => config.role === 'admin';
// @ts-expect-error TS2322 handler parameters are contravariant
const widened: Core.Policy = hasRole;

export { widened };
