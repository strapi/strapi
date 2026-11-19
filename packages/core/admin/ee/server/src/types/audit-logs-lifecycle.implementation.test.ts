// Compile-only assertions. The EE server tsconfig includes this file; declaration builds exclude it.
import type { Core, Modules } from '@strapi/types';
import type { createAuditLogsLifecycleService } from '../audit-logs/services/lifecycles';

type Lifecycle = ReturnType<typeof createAuditLogsLifecycleService>;
type Contract = Modules.AuditLogs.AuditLogsLifecycleService;

// `strapi.get('audit-logs-lifecycle')`: the service is assignable to the contract packages read it
// through, and has exactly its members.
export type AuditLogsLifecycleTies = [
  Core.Assert<Lifecycle extends Contract ? true : false>,
  Core.Assert<Core.SameNames<keyof Lifecycle, keyof Contract>>,
  // Every option the service reads is in the contract.
  Core.Assert<
    Core.SameNames<
      keyof NonNullable<Parameters<Lifecycle['registerEvent']>[2]>,
      keyof Modules.AuditLogs.RegisterEventOptions
    >
  >,
];
