import type {
  CodeFinding,
  CodeFindingRule,
  MigrationItemKind,
  MigrationReport,
  MigrationReportItem,
} from '../../../shared/contracts/migration';
import { UP_CONFIG_MAP } from '../compat/config-map';
import { PROVIDERS_WITHOUT_EMAIL_VERIFICATION } from '../utils/pending-link';
import { COMPAT_ROWS } from '../compat/rows';
import { mapUpGrant } from './map-providers';
import { mapRolePermissions } from './map-permissions';
import type { PermissionMapContext } from './map-permissions';
import { translateUpTemplate } from './map-templates';
import type { UpEmailKey } from './map-templates';
import type { DbClient, DuplicateGroup, UpSnapshot } from './snapshot';

export type { DbClient } from './snapshot';

export interface ReportContext {
  source: 'check' | 'migration';
  client: DbClient;
  compat: boolean;
  now: Date;
  permissionContext: PermissionMapContext;
  requiredProviderFields: (id: string) => string[] | null;
  graphqlNullable: Array<{ uid: string; fields: string[] }>;
  /**
   * The project's own types with required fields, when it serves GraphQL and the plugin is in check
   * mode: what the switch makes nullable in the schema. `null` when there is nothing to announce.
   */
  graphqlRequired: Array<{ uid: string; fields: string[] }> | null;
  /** U&P config keys the project sets (check only) */
  configKeys: string[];
  /** What `planProjectFiles` found (check only) */
  codeFindings: CodeFinding[];
}

type Severity = MigrationReportItem['severity'];

/**
 * What a project has to do something about. Every other kind is information. `code-finding` is
 * decided per rule (`CODE_FINDING_SEVERITY`), so its kind is informational here.
 */
export const ITEM_SEVERITY: Readonly<Record<MigrationItemKind, Severity>> = {
  'duplicate-email': 'action',
  'duplicate-username': 'info',
  'role-renamed': 'info',
  'permission-dropped': 'info',
  'permission-changed': 'info',
  'provider-needs-input': 'action',
  'provider-not-supported': 'action',
  'provider-users': 'info',
  'provider-pending-links': 'info',
  'template-untranslated': 'action',
  'template-skipped': 'info',
  'email-sender': 'info',
  'registration-field-dropped': 'info',
  'api-token': 'action',
  'admin-permission': 'info',
  'username-native-refused': 'info',
  'username-with-at': 'info',
  'pending-tokens': 'info',
  'user-email-read-only': 'info',
  'staged-undeclared': 'action',
  'not-null-column': 'action',
  'inverse-dropped': 'info',
  'graphql-nullable': 'info',
  'layout-not-carried': 'info',
  'config-key': 'info',
  'code-finding': 'info',
  'compat-note': 'info',
};

/** The severity of a `code-finding` item, by the rule that found it */
export const CODE_FINDING_SEVERITY: Readonly<Record<CodeFindingRule, Severity>> = {
  'plugin-service': 'action',
  'strapi-server': 'action',
  'custom-provider': 'action',
  lifecycle: 'action',
  'config-not-editable': 'action',
  'old-uid': 'info',
  'role-relation': 'info',
  'inverse-dropped': 'info',
  'profile-clash': 'info',
  'validate-password': 'info',
  'callback-validate': 'info',
  'unknown-config-key': 'info',
  'secret-to-set': 'info',
  'legacy-secret': 'info',
  'no-source': 'info',
};

/**
 * Milliseconds the migrated start took per 1,000 users in the rehearsal
 * (`tests/api/plugins/end-users/migration/rehearsal.test.api.ts`), by database. `null` where it has
 * not been measured: the report then gives no estimate rather than a guess. The rates come from a
 * fast workstation, so what they give is a lower bound, and the admin words it as one.
 */
export const MEASURED_MS_PER_1000_USERS: Record<DbClient, number | null> = {
  sqlite: 780,
  // The same rehearsal on Postgres 17: 166 s for 100,008 users
  postgres: 1660,
  mysql: null,
};

/** Whole minutes (at least one) the migration takes for `users` users on `client`, or null */
export const estimateMinutes = (client: DbClient, users: number): number | null => {
  const rate = MEASURED_MS_PER_1000_USERS[client];

  if (rate === null) {
    return null;
  }

  return Math.max(1, Math.ceil(((users / 1000) * rate) / 60_000));
};

/** An item lists at most this many references; its `count` is always the whole number */
const MAX_REFS = 200;

const UP = 'plugin::users-permissions.';

const item = (
  kind: MigrationItemKind,
  key: string,
  message: string,
  extra: { count?: number; refs?: Array<number | string>; severity?: Severity } = {}
): MigrationReportItem => ({
  id: `${kind}:${key}`,
  kind,
  severity: extra.severity ?? ITEM_SEVERITY[kind],
  message,
  ...(extra.count === undefined ? {} : { count: extra.count }),
  ...(extra.refs === undefined ? {} : { refs: extra.refs.slice(0, MAX_REFS) }),
  resolved: false,
});

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** `12:15,19`: the id kept, then the ids rewritten */
const groupRefs = (groups: DuplicateGroup[]): string[] =>
  groups.map((group) => `${group.keep}:${group.rewrite.join(',')}`);

const callbackPath = (id: string) => `/api/connect/${id}/callback`;

const redirectNote = (id: string, compat: boolean) =>
  compat
    ? `Its redirect URI, ${callbackPath(id)}, stays the same while compatibility mode is on, so nothing changes at the provider.`
    : `Its redirect URI is the one shown in its settings, which has to be set at the provider.`;

const duplicateItems = (snapshot: UpSnapshot): MigrationReportItem[] => {
  const items: MigrationReportItem[] = [];
  const emails = snapshot.duplicateEmails;
  const names = snapshot.duplicateUsernames;
  const roles = snapshot.duplicateRoleNames;

  if (emails.length > 0) {
    const rewritten = emails.reduce((sum, group) => sum + group.rewrite.length, 0);
    items.push(
      item(
        'duplicate-email',
        'all',
        `${plural(emails.length, 'email address', 'email addresses')} used by more than one user once capitals are ignored. ` +
          `The oldest user in each group keeps the address; the other ${plural(rewritten, 'user')} ${rewritten === 1 ? 'is' : 'are'} rewritten. ` +
          `Each ref is the kept id, then the rewritten ids.`,
        { count: emails.length, refs: groupRefs(emails) }
      )
    );
  }

  if (names.length > 0) {
    const rewritten = names.reduce((sum, group) => sum + group.rewrite.length, 0);
    items.push(
      item(
        'duplicate-username',
        'all',
        `${plural(names.length, 'username')} used by more than one user once capitals are ignored. ` +
          `The oldest user in each group keeps the name; the other ${plural(rewritten, 'user')} ${rewritten === 1 ? 'is' : 'are'} rewritten. ` +
          `Each ref is the kept id, then the rewritten ids.`,
        { count: names.length, refs: groupRefs(names) }
      )
    );
  }

  if (roles.length > 0) {
    items.push(
      item(
        'role-renamed',
        'all',
        `${plural(roles.length, 'role name')} used by more than one role once capitals are ignored; the newer roles are renamed. ` +
          `Each ref is the kept role id, then the renamed ones.`,
        { count: roles.length, refs: groupRefs(roles) }
      )
    );
  }

  return items;
};

const usernameItems = (snapshot: UpSnapshot): MigrationReportItem[] => {
  const { nativeRefused, withAt } = snapshot.usernames;
  const items: MigrationReportItem[] = [];

  if (nativeRefused.length > 0) {
    items.push(
      item(
        'username-native-refused',
        'all',
        `${plural(nativeRefused.length, 'user')} hold a username the native sign-in does not accept (3 to 30 letters, digits, _ and . only). ` +
          'The names are kept as stored; the native sign-up would not accept them.',
        { count: nativeRefused.length, refs: nativeRefused }
      )
    );
  }

  if (withAt.length > 0) {
    items.push(
      item(
        'username-with-at',
        'all',
        `${plural(withAt.length, 'user')} hold a username with an @ in it. The native sign-in does not accept an @ in a username.`,
        { count: withAt.length, refs: withAt }
      )
    );
  }

  return items;
};

const providerItems = (snapshot: UpSnapshot, ctx: ReportContext): MigrationReportItem[] => {
  const items: MigrationReportItem[] = [];
  const mappings = snapshot.store.grant
    ? mapUpGrant(snapshot.store.grant, ctx.requiredProviderFields)
    : [];

  for (const mapping of mappings) {
    if (mapping.kind === 'needs-input') {
      items.push(
        item(
          'provider-needs-input',
          mapping.upId,
          `The ${mapping.upId} provider is carried over disabled: it needs ${mapping.missing.join(', ')} set in the admin before it works. ${redirectNote(mapping.upId, ctx.compat)}`,
          { count: mapping.missing.length, refs: mapping.missing }
        )
      );
    } else if (mapping.kind === 'not-supported') {
      const why =
        mapping.reason === 'custom'
          ? 'it is a custom provider that end-users has no definition of'
          : 'end-users has no equivalent';
      items.push(
        item(
          'provider-not-supported',
          mapping.upId,
          `The ${mapping.upId} provider is not carried over: ${why}. ${redirectNote(mapping.upId, ctx.compat)}`
        )
      );
    }
  }

  for (const [provider, users] of Object.entries(snapshot.users.byProvider)) {
    if (provider === 'local' || users === 0) {
      continue;
    }

    const message = PROVIDERS_WITHOUT_EMAIL_VERIFICATION.includes(provider)
      ? `${plural(users, 'user')} signed up with ${provider}, which never says an address is verified. Each one who confirmed their address and is not blocked gets a pending link: their first sign-in with ${provider}, with the address they have here, links it to their account, until compatibility mode is turned off. ` +
        `The others sign in with ${provider} once an administrator trusts it for account linking. ${redirectNote(provider, ctx.compat)}`
      : `${plural(users, 'user')} signed up with ${provider}. They are linked to their account when they next sign in with it, as long as ${provider} reports the address as verified and the user's address is confirmed here; ` +
        `otherwise the sign-in is refused with account_not_linked. ${redirectNote(provider, ctx.compat)}`;

    items.push(item('provider-users', provider, message, { count: users }));
  }

  return items;
};

/**
 * The item that says how many users the migration gave a pending link (`utils/pending-link`), by
 * the counts of each provider, or `null` when it gave none. Provider ids and counts only.
 */
export const pendingLinkItem = (byProvider: Record<string, number>): MigrationReportItem | null => {
  const providers = Object.keys(byProvider).sort((a, b) => a.localeCompare(b));
  const total = providers.reduce((sum, provider) => sum + byProvider[provider], 0);

  if (total === 0) {
    return null;
  }

  return item(
    'provider-pending-links',
    'all',
    `${plural(total, 'user')} who signed up with a provider that never says an address is verified ${total === 1 ? 'has' : 'have'} a pending link (${providers.map((provider) => `${provider}: ${byProvider[provider]}`).join(', ')}). ` +
      'Their first sign-in with that provider, with the address they have here, links it to their account. The links that are left are dropped when compatibility mode is turned off. Refs are the providers.',
    { count: total, refs: providers }
  );
};

const EMAIL_KEYS: UpEmailKey[] = ['reset_password', 'email_confirmation'];

const templateItems = (snapshot: UpSnapshot): MigrationReportItem[] => {
  const items: MigrationReportItem[] = [];
  const senderKeys: string[] = [];

  for (const upKey of EMAIL_KEYS) {
    const stored = snapshot.store.email?.[upKey];

    if (!stored) {
      continue;
    }

    const translation = translateUpTemplate(upKey, stored);

    if (translation.kind === 'untranslated') {
      items.push(
        item(
          'template-untranslated',
          translation.key,
          `The ${upKey.replace('_', ' ')} email was edited and uses ${plural(translation.placeholders.length, 'expression')} that cannot be carried over. It keeps the end-users default until it is rewritten.`,
          { count: translation.placeholders.length }
        )
      );
    }

    if (translation.sender) {
      senderKeys.push(translation.key);
    }
  }

  if (senderKeys.length > 0) {
    items.push(
      item(
        'email-sender',
        'all',
        'A stored template sets its own sender or reply-to address. Set it in the email plugin configuration instead.',
        { count: senderKeys.length, refs: senderKeys }
      )
    );
  }

  return items;
};

/**
 * Permission items, one pair per role with a stable id, so the step that runs once every Content API
 * action is registered can replace them. An action `isKnownAction` can't tell about yet (`null`) is
 * not counted as dropped here: it is named in the message and decided then.
 */
export const permissionItems = (
  snapshot: Pick<UpSnapshot, 'roles'>,
  ctx: Pick<ReportContext, 'permissionContext'>
): MigrationReportItem[] => {
  const items: MigrationReportItem[] = [];
  const undecided = new Set<string>();
  const permissionContext: PermissionMapContext = {
    ...ctx.permissionContext,
    isKnownAction(action) {
      const known = ctx.permissionContext.isKnownAction(action);

      if (known === null) {
        undecided.add(action);
      }

      return known;
    },
  };

  for (const role of snapshot.roles) {
    undecided.clear();
    const mapping = mapRolePermissions(role.actions, role.type, permissionContext);
    const dropped = mapping.dropped.filter((entry) => !undecided.has(entry.action));
    const later = mapping.dropped.length - dropped.length;

    if (dropped.length > 0) {
      const reasons = new Map<string, number>();

      for (const entry of dropped) {
        reasons.set(entry.reason, (reasons.get(entry.reason) ?? 0) + 1);
      }

      const summary = [...reasons.entries()].map(([reason, n]) => `${n} ${reason}`).join(', ');
      const decidedLater =
        later > 0 ? ` ${plural(later, 'more')} are decided once the application has loaded.` : '';

      items.push(
        item(
          'permission-dropped',
          String(role.id),
          `Role ${role.id} loses ${plural(dropped.length, 'permission')} with no counterpart (${summary}).${decidedLater}`,
          { count: dropped.length, refs: dropped.map((entry) => entry.action) }
        )
      );
    }

    if (mapping.changed.length > 0) {
      const drafts = mapping.changed.filter((entry) => entry.change === 'drafts').length;
      const self = mapping.changed.length - drafts;
      const parts = [
        self > 0 ? `${plural(self, 'permission')} limited to the user's own record` : null,
        drafts > 0 ? `${plural(drafts, 'permission')} no longer reaching drafts` : null,
      ].filter((part): part is string => part !== null);

      items.push(
        item(
          'permission-changed',
          String(role.id),
          `Role ${role.id} keeps ${parts.join(' and ')}.`,
          { count: mapping.changed.length, refs: mapping.changed.map((entry) => entry.action) }
        )
      );
    }
  }

  return items;
};

const codeFindingItems = (findings: CodeFinding[]): MigrationReportItem[] => {
  const byRule = new Map<CodeFindingRule, CodeFinding[]>();

  for (const finding of findings) {
    byRule.set(finding.rule, [...(byRule.get(finding.rule) ?? []), finding]);
  }

  return [...byRule.entries()].map(([rule, list]) => {
    const refs = list.map((finding) =>
      finding.line === null ? finding.path : `${finding.path}:${finding.line}`
    );
    const message = `${list[0].message}${list.length > 1 ? ` (${list.length} places)` : ''}`;
    const kind: MigrationItemKind = rule === 'inverse-dropped' ? 'inverse-dropped' : 'code-finding';

    return item(kind, rule, message, {
      count: list.length,
      refs,
      severity: CODE_FINDING_SEVERITY[rule],
    });
  });
};

const configKeyItems = (keys: string[]): MigrationReportItem[] =>
  keys.map((key) => {
    const entry = UP_CONFIG_MAP[key];
    const message = entry
      ? `${entry.target ? `Becomes ${entry.target}. ` : 'Has no counterpart. '}${entry.note}`
      : 'Is not a Users & Permissions option end-users knows.';

    return item('config-key', key, message);
  });

const compatNoteItems = (): MigrationReportItem[] =>
  COMPAT_ROWS.filter((row) => row.note).map((row) =>
    item('compat-note', String(row.row), [row.break, row.note].filter(Boolean).join(' '))
  );

/** The users-permissions `user.update` action: what the email change below is about */
const USER_UPDATE = `${UP}user.update`;

const accountItems = (snapshot: UpSnapshot): MigrationReportItem[] => {
  const items: MigrationReportItem[] = [];
  const { users } = snapshot;
  const updaters = snapshot.roles.filter((role) => role.actions.includes(USER_UPDATE));

  items.push(
    item(
      'user-email-read-only',
      'all',
      'An email address is accepted when a user is created but refused on PUT /api/users/:id, which Users & Permissions allowed. Email changes go through the change-email flow. Refs are the roles that held user.update.',
      { count: updaters.length, refs: updaters.map((role) => role.id) }
    )
  );

  if (users.pendingResets + users.pendingConfirmations > 0) {
    items.push(
      item(
        'pending-tokens',
        'all',
        `${plural(users.pendingResets, 'password reset token')} ${users.pendingResets === 1 ? 'is' : 'are'} not carried; those users ask for a new reset. ` +
          `${plural(users.pendingConfirmations, 'confirmation link')} ${users.pendingConfirmations === 1 ? 'keeps' : 'keep'} working while compatibility mode is on.`,
        { count: users.pendingResets + users.pendingConfirmations }
      )
    );
  }

  items.push(
    item(
      'layout-not-carried',
      'all',
      'The Content Manager layout of the user type (list columns, edit view arrangement) is not carried; set it up again in the admin.'
    )
  );

  return items;
};

const structureItems = (snapshot: UpSnapshot): MigrationReportItem[] => {
  const items: MigrationReportItem[] = [];
  const tokens = snapshot.apiTokens;
  const adminPermissions = snapshot.adminPermissions;

  if (snapshot.notNullColumns.length > 0) {
    items.push(
      item(
        'not-null-column',
        'all',
        `${plural(snapshot.notNullColumns.length, 'column')} of the user table are required without a default. A user created without a value for them is refused; declare them in the user type with a default.`,
        { count: snapshot.notNullColumns.length, refs: snapshot.notNullColumns }
      )
    );
  }

  if (tokens.length > 0) {
    items.push(
      item(
        'api-token',
        'all',
        `${plural(tokens.length, 'API token')} hold users-permissions actions. The migration never changes API tokens, so review what each may reach after migrating.`,
        { count: tokens.length, refs: tokens.map((token) => token.id) }
      )
    );
  }

  if (adminPermissions.length > 0) {
    const roleIds = [...new Set(adminPermissions.map((permission) => permission.roleId))];
    items.push(
      item(
        'admin-permission',
        'all',
        `${plural(adminPermissions.length, 'admin permission')} on ${plural(roleIds.length, 'admin role')} refer to users-permissions. Admin roles are not changed; grant the end-users permissions to them in the admin.`,
        { count: adminPermissions.length, refs: roleIds }
      )
    );
  }

  return items;
};

const graphqlItems = (ctx: ReportContext): MigrationReportItem[] => {
  const items: MigrationReportItem[] = [];
  const fields = ctx.graphqlNullable.reduce((sum, type) => sum + type.fields.length, 0);

  if (fields > 0) {
    items.push(
      item(
        'graphql-nullable',
        'all',
        `${plural(fields, 'field')} on ${plural(ctx.graphqlNullable.length, 'type')} are nullable in the GraphQL schema. A client typed on a non-null value for them needs a check.`,
        { count: fields, refs: ctx.graphqlNullable.map((type) => type.uid) }
      )
    );
  }

  if (ctx.graphqlRequired) {
    const required = ctx.graphqlRequired.reduce((sum, type) => sum + type.fields.length, 0);
    const types = ctx.graphqlRequired.length;

    items.push(
      item(
        'graphql-nullable',
        'required',
        'Once the project switches to end-users, every output field that is required in the GraphQL schema becomes nullable, on every content type and component, because a field rule can hide a field from a caller. ' +
          'Input types keep their required fields, and check mode changes nothing. ' +
          `The project's own types have ${plural(required, 'required field')}${types > 0 ? ` on ${plural(types, 'type')}` : ''}; a client typed on a non-null value for them needs a check. Refs are those types.`,
        { count: required, refs: ctx.graphqlRequired.map((type) => type.uid) }
      )
    );
  }

  return items;
};

const estimate = (client: DbClient, users: number): MigrationReport['estimate'] => {
  const minutes = estimateMinutes(client, users);

  return minutes === null ? null : { client, minutes };
};

/**
 * The migration report for a snapshot: what changes, what needs a decision and what is only worth
 * knowing, as items of ids and counts. Pure; the snapshot is read elsewhere.
 */
export const buildReport = (snapshot: UpSnapshot, ctx: ReportContext): MigrationReport => {
  const everything = [
    ...duplicateItems(snapshot),
    ...usernameItems(snapshot),
    ...providerItems(snapshot, ctx),
    ...templateItems(snapshot),
    ...permissionItems(snapshot, ctx),
    ...accountItems(snapshot),
    ...structureItems(snapshot),
    ...graphqlItems(ctx),
    ...codeFindingItems(ctx.codeFindings),
    ...configKeyItems(ctx.configKeys),
    ...(ctx.compat ? compatNoteItems() : []),
  ];
  // Stable: the action items first, each group in the order it was built
  const items = [...everything].sort(
    (a, b) => Number(b.severity === 'action') - Number(a.severity === 'action')
  );

  const providerUsers = Object.fromEntries(
    Object.entries(snapshot.users.byProvider).filter(([provider]) => provider !== 'local')
  );

  return {
    version: 1,
    source: ctx.source,
    generatedAt: ctx.now.toISOString(),
    counts: {
      users: snapshot.users.total,
      localUsers: snapshot.users.local,
      providerUsers,
      roles: snapshot.roles.length,
      permissions: snapshot.roles.reduce((sum, role) => sum + role.actions.length, 0),
    },
    estimate: estimate(ctx.client, snapshot.users.total),
    items,
  };
};

/**
 * The types with required attributes a client can read, with those attributes: what a GraphQL
 * schema shows as non-null until end-users makes them nullable. A type with none is left out.
 */
export const requiredOnGraphql = (
  types: Record<string, { attributes?: Record<string, { required?: boolean; private?: boolean }> }>
): Array<{ uid: string; fields: string[] }> =>
  Object.entries(types)
    .map(([uid, type]) => ({
      uid,
      fields: Object.entries(type.attributes ?? {})
        .filter(([, attribute]) => attribute.required === true && attribute.private !== true)
        .map(([name]) => name),
    }))
    .filter((type) => type.fields.length > 0);

/**
 * The content types whose attributes are not required, with those attributes: what a GraphQL schema
 * shows as nullable. A type with none is left out.
 */
export const nullableOnGraphql = (
  types: Record<string, { attributes: Record<string, { required?: boolean }> }>
): Array<{ uid: string; fields: string[] }> =>
  Object.entries(types)
    .map(([uid, type]) => ({
      uid,
      fields: Object.entries(type.attributes)
        .filter(([, attribute]) => attribute.required !== true)
        .map(([name]) => name),
    }))
    .filter((type) => type.fields.length > 0);
