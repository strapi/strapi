import type { ConfigSummary } from './settings';

export type MigrationItemKind =
  | 'duplicate-email'
  | 'duplicate-username'
  | 'role-renamed'
  | 'permission-dropped'
  | 'permission-changed'
  | 'provider-needs-input'
  | 'provider-not-supported'
  | 'provider-users'
  | 'template-untranslated'
  | 'template-skipped'
  | 'email-sender'
  | 'registration-field-dropped'
  | 'api-token'
  | 'admin-permission'
  | 'username-native-refused'
  | 'username-with-at'
  | 'pending-tokens'
  | 'user-email-read-only'
  | 'staged-undeclared'
  | 'not-null-column'
  | 'inverse-dropped'
  | 'graphql-nullable'
  | 'layout-not-carried'
  | 'config-key'
  | 'code-finding'
  | 'compat-note';

export interface MigrationReportItem {
  /** `${kind}:${key}`, stable across reads */
  id: string;
  kind: MigrationItemKind;
  severity: 'action' | 'info';
  /** Plain words, ids and counts only */
  message: string;
  count?: number;
  refs?: Array<number | string>;
  resolved: boolean;
  resolvedAt?: string;
}

export interface MigrationReport {
  version: 1;
  source: 'check' | 'migration';
  generatedAt: string;
  counts: {
    users: number;
    localUsers: number;
    providerUsers: Record<string, number>;
    roles: number;
    permissions: number;
  };
  estimate: { client: 'sqlite' | 'postgres' | 'mysql'; minutes: number } | null;
  items: MigrationReportItem[];
}

export type CodeFindingRule =
  | 'plugin-service'
  | 'strapi-server'
  | 'custom-provider'
  | 'old-uid'
  | 'role-relation'
  | 'lifecycle'
  | 'inverse-dropped'
  | 'profile-clash'
  | 'config-not-editable'
  | 'validate-password'
  | 'callback-validate'
  | 'unknown-config-key'
  | 'secret-to-set'
  | 'legacy-secret'
  | 'no-source';

export interface CodeFinding {
  path: string;
  line: number | null;
  rule: CodeFindingRule;
  message: string;
}

export type MigrationStatus = 'in-progress' | 'completed' | 'rolled-back';

export type MigrationStep =
  'pre-sync' | 'users' | 'roles' | 'permissions' | 'profiles' | 'accounts' | 'stores' | 'admin';

/**
 * The migration's record in the plugin store. `status` and `cutoverAt` are what the compatibility
 * mode reads; the rest is the migration's own bookkeeping.
 */
export interface MigrationRecord {
  status: MigrationStatus;
  cutoverAt: string | null;
  attempt: number;
  startedAt: string;
  completedAt: string | null;
  rolledBackAt: string | null;
  cleanedUpAt: string | null;
  completedSteps: MigrationStep[];
  /** `eu_stg_<n>` to the table it was copied from */
  staged: Record<string, string>;
  /** `copied`: the staged tables already copied back */
  carried: { defaultRoleDocumentId: string | null; copied: string[] };
  claim: { by: string; until: string } | null;
}

/** What the admin may see of the record: no bookkeeping */
export type PublicMigrationRecord = Pick<
  MigrationRecord,
  'status' | 'attempt' | 'startedAt' | 'cutoverAt' | 'completedAt' | 'rolledBackAt' | 'cleanedUpAt'
>;

export interface MigrationStatusResponse {
  data: {
    mode: 'check' | 'active';
    config: ConfigSummary['migration'];
    record: PublicMigrationRecord | null;
    report: MigrationReport | null;
    unresolved: number;
    legacyJwtHits: { legacy: number; access: number; lastHitAt: string | null } | null;
  };
}

/** One file a project changes: `before` null is a file created, `after` null a file deleted */
export interface FileChange {
  path: string;
  before: string | null;
  after: string | null;
}

export type ProjectFilesReason = 'not-development' | 'no-source' | 'config-not-editable';

/** What `GET /end-users/migration/files` answers */
export interface ProjectFiles {
  writable: boolean;
  reason: ProjectFilesReason | null;
  /** The schema files only; the config file is never sent back */
  changes: FileChange[];
  /** The `'end-users'` entry, for a project that edits its config by hand */
  configBlock: string;
  /** The line that turns Users & Permissions off, for the same */
  usersPermissionsLine: string;
  findings: CodeFinding[];
}
