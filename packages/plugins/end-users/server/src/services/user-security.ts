import { contentTypes as contentTypesUtils, errors } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';

import type {
  UserSecurity,
  UserSecurityAccount,
  UserSecuritySession,
} from '../../../shared/contracts/user-security';
import { PLUGIN_ID, USER_UID } from '../constants';
import { singularNameOf } from '../engine/better-auth/model-names';
import type { AuthEngine, EngineAccount, EngineSession } from '../engine/types';
import type abilityService from './ability';
import type { CallerPermissions } from './ability';
import type roleService from './role';
import type settingsService from './settings';
import { banState } from '../utils/ban';
import { isPlain } from '../utils/is-plain';
import { contentTypesOf, documentsOf, type PluginDocuments } from '../utils/typed-strapi';

type Plain = Record<string, unknown>;

/** What an admin may do with a user's security: read it, or change it. */
export type SecurityAccess = 'read' | 'update';

/** The Content Manager's own actions on the end-user type, so no admin action of the plugin's */
export const SECURITY_ACTIONS: Record<SecurityAccess, string> = {
  read: 'plugin::content-manager.explorer.read',
  update: 'plugin::content-manager.explorer.update',
};

/** The longest reason a ban keeps */
const MAX_REASON_LENGTH = 500;

const iso = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value as string | number);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/**
 * One session as the admin sees it. Picked field by field, never spread: the engine's session has
 * a `token`, a credential that must not reach a client.
 */
const toSession = (session: EngineSession): UserSecuritySession => ({
  id: session.id,
  createdAt: iso(session.createdAt) as string,
  expiresAt: iso(session.expiresAt) as string,
  ipAddress: session.ipAddress ?? null,
  userAgent: session.userAgent ?? null,
});

const toAccount = (account: EngineAccount): UserSecurityAccount => ({
  id: account.id,
  providerId: account.providerId,
});

interface AbilityRule {
  fields?: string[] | null;
  inverted?: boolean;
}

/** The part of an admin ability this service reads: its rules, for one field when it is given. */
interface RuleReader {
  rulesFor: (action: string, subject: string, field?: string) => AbilityRule[];
}

/** What reaches a user is judged for one field at a time: an ability that answers with that field's rules. */
const abilityFor = (ability: RuleReader, field: string): RuleReader => ({
  rulesFor: (action, subject) => ability.rulesFor(action, subject, field),
});

/**
 * Whether the admin's permission for `action` on the end-user type has no field restriction: a
 * permission without `properties.fields`, or whose fields name every attribute of the type that
 * a permission can name: the visible ones, as the Super Admin's permissions list them (the ids,
 * timestamps, `locale` and the like are never in a permission's fields).
 * Security acts on the whole user, so an admin limited to some fields must not reach it.
 * Anything that cannot be read as a rule list is a refusal.
 */
const coversEveryField = (ability: unknown, action: string, names: string[]): boolean => {
  const rulesFor = (ability as { rulesFor?: (a: string, s: string) => AbilityRule[] } | null)
    ?.rulesFor;

  if (typeof rulesFor !== 'function') {
    return false;
  }

  const rules = rulesFor.call(ability, action, USER_UID);

  if (rules.some((rule) => rule.inverted)) {
    return false;
  }

  if (rules.some((rule) => rule.fields === undefined || rule.fields === null)) {
    return true;
  }

  const named = new Set(rules.flatMap((rule) => rule.fields ?? []));

  return names.every((name) => named.has(name));
};

/** Whether any rule for `action` names the fields it covers (one without a list covers every field). */
const hasFieldList = (ability: unknown, action: string): boolean => {
  const rules = (ability as { rulesFor: (a: string, s: string) => AbilityRule[] }).rulesFor(
    action,
    USER_UID
  );

  return rules.some((rule) => Array.isArray(rule.fields));
};

const refuse = (message: string): never => {
  throw new errors.ValidationError(message);
};

/**
 * `strapi.plugin('end-users').service('user-security')`: what the Content Manager's Security panel
 * of one end user reads and does, through the engine.
 *
 * The admin's right to do it is the Content Manager's, on the end-user type (`authorize`): read for
 * the panel, update for everything it changes. What the admin may read of the type also limits
 * which users they can reach, as it does in the list.
 */
const userSecurityService = ({ strapi }: { strapi: Core.Strapi }) => {
  const engine = () => strapi.plugin(PLUGIN_ID).service('engine').get() as AuthEngine;
  const plugin = () => strapi.plugin(PLUGIN_ID);

  /** The user the check let through, for the others to read the address and flags of */
  const userOf = async (documentId: string): Promise<Plain> => {
    const user = await documentsOf<PluginDocuments>(strapi, USER_UID).findFirst({
      filters: { documentId },
    });

    if (!user) {
      throw new errors.NotFoundError('User not found');
    }

    return user;
  };

  const countPasskeys = async (documentId: string): Promise<number> => {
    const uid = `plugin::${PLUGIN_ID}.${singularNameOf('passkey')}`;

    // Without the passkey plugin there is no such table, and so no passkeys
    if (!contentTypesOf<Plain>(strapi)[uid]) {
      return 0;
    }

    return strapi.db.query(uid).count({ where: { userId: documentId } });
  };

  const redirectOf = async (key: 'passwordReset' | 'emailVerified'): Promise<string> => {
    const { redirects } = await (
      plugin().service('settings') as ReturnType<typeof settingsService>
    ).get();

    // The same setting an email the user asks for would use; the site's root otherwise
    return redirects[key] ?? '/';
  };

  return {
    /**
     * Whether the admin may do `access` to end users, and whether this user is one they can reach:
     * a `PolicyError` (403) for an admin without the Content Manager's action on the type, and a
     * `NotFoundError` for a user they may not read or that does not exist. The permission must have no
     * field restriction (it covers every field of the type), or the answer is the same 403. Answered before anything
     * else, so a refusal says nothing about the user.
     */
    async authorize(ability: unknown, access: SecurityAccess, documentId: string): Promise<void> {
      const action = SECURITY_ACTIONS[access];
      const model = contentTypesOf<Record<string, Struct.ContentTypeSchema>>(strapi)[USER_UID];
      // `model` is not there only when the type is not (the permissions manager refuses first)
      const names = model ? contentTypesUtils.getVisibleAttributes(model) : [];
      const manager = (given: unknown) =>
        strapi.service('admin::permission').createPermissionsManager({
          ability: given,
          action,
          model: USER_UID,
        });
      const permissions = manager(ability);
      let query: unknown = permissions.isAllowed ? permissions.getQuery() : undefined;

      // The query above is every rule's condition, ORed. Where a permission limited to some fields
      // sits beside one with every field and a condition, that reaches users the full one does not
      // (the admin could ban any user for `[email]`). Security acts on the whole user, so a user is
      // reachable when every field of the type is: each field is judged by the rules that cover it.
      if (
        typeof query === 'object' &&
        query !== null &&
        coversEveryField(ability, action, names) &&
        hasFieldList(ability, action)
      ) {
        const perField = names.map((name) =>
          manager(abilityFor(ability as RuleReader, name)).getQuery()
        );

        // A field open to everyone has an empty query, which narrows nothing
        const narrowing = [
          ...new Map(
            perField
              .filter((one) => isPlain(one) && Object.keys(one).length > 0)
              .map((one) => [JSON.stringify(one), one])
          ).values(),
        ];

        if (!perField.every(isPlain)) {
          query = undefined;
        } else {
          query = narrowing.length > 0 ? { $and: narrowing } : {};
        }
      }

      if (
        typeof query !== 'object' ||
        query === null ||
        Array.isArray(query) ||
        !coversEveryField(ability, action, names)
      ) {
        throw new errors.PolicyError(
          `The security of an end user needs Content Manager ${access} access to every field of end users`
        );
      }

      const found = await documentsOf<PluginDocuments>(strapi, USER_UID).findFirst({
        filters: { $and: [{ documentId }, query] },
        fields: ['documentId'],
      });

      if (!found) {
        throw new errors.NotFoundError('User not found');
      }
    },

    async get(documentId: string): Promise<UserSecurity> {
      const user = await userOf(documentId);
      const [accounts, sessions, passkeys] = await Promise.all([
        engine().listAccounts(documentId),
        engine().listSessions(documentId),
        countPasskeys(documentId),
      ]);

      return {
        accounts: accounts.map(toAccount),
        twoFactor: user.twoFactorEnabled === true,
        passkeys,
        sessions: sessions.map(toSession),
        status: {
          banned: user.banned === true,
          banReason: typeof user.banReason === 'string' ? user.banReason : null,
          banExpires: iso(user.banExpires),
          lockedUntil: iso(user.lockedUntil),
        },
      };
    },

    async revokeSession(documentId: string, sessionId: string): Promise<void> {
      await userOf(documentId);
      await engine().revokeSession(documentId, sessionId);
    },

    async revokeSessions(documentId: string): Promise<void> {
      await userOf(documentId);
      await engine().revokeSessions(documentId);
    },

    /** Never the last one: the user would have no way left to sign in */
    async unlinkAccount(documentId: string, accountId: string): Promise<void> {
      await userOf(documentId);

      const accounts = await engine().listAccounts(documentId);

      if (!accounts.some(({ id }) => id === accountId)) {
        throw new errors.NotFoundError('Account not found');
      }

      if (accounts.length <= 1) {
        throw new errors.ApplicationError('The last sign-in method of a user cannot be removed.');
      }

      await engine().unlinkAccount(documentId, accountId);
    },

    /** The engine also signs the user out everywhere. `expiresAt` is a date in the future. */
    async ban(documentId: string, input: { reason?: unknown; expiresAt?: unknown }): Promise<void> {
      const { reason, expiresAt } = input;

      if (reason !== undefined && reason !== null && typeof reason !== 'string') {
        refuse('reason is a text');
      }

      if (typeof reason === 'string' && reason.length > MAX_REASON_LENGTH) {
        refuse(`reason is at most ${MAX_REASON_LENGTH} characters`);
      }

      let until: Date | undefined;

      if (expiresAt !== undefined && expiresAt !== null) {
        until = typeof expiresAt === 'string' ? new Date(expiresAt) : new Date(Number.NaN);

        if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
          refuse('expiresAt is a date and time in the future');
        }
      }

      await userOf(documentId);
      await engine().ban(documentId, (reason as string | null | undefined) || undefined, until);
    },

    async unban(documentId: string): Promise<void> {
      await userOf(documentId);
      await engine().unban(documentId);
    },

    async unlock(documentId: string): Promise<void> {
      await userOf(documentId);
      await engine().unlock(documentId);
    },

    async resetTwoFactor(documentId: string): Promise<void> {
      await userOf(documentId);
      await engine().resetTwoFactor(documentId);
    },

    async sendPasswordReset(documentId: string): Promise<void> {
      const user = await userOf(documentId);

      // The reset sender mails a banned user nothing, so saying "sent" would be false. An admin has
      // no address to protect from enumeration: they are told
      if (banState(user) === 'active') {
        refuse('This user is banned. Unban them before sending a password reset.');
      }

      await engine().sendPasswordReset(user.email as string, await redirectOf('passwordReset'));
    },

    async sendVerification(documentId: string): Promise<void> {
      await userOf(documentId);
      await engine().sendVerificationEmail(documentId, await redirectOf('emailVerified'));
    },

    /**
     * What the user's roles let them do on the Content API, as `GET /api/end-users/permissions/me`
     * describes it for the user themselves: built the same way the strategy builds a request's.
     */
    async effectivePermissions(documentId: string): Promise<CallerPermissions> {
      const user = await userOf(documentId);
      const held = await (plugin().service('role') as ReturnType<typeof roleService>).getForUser(
        documentId
      );
      const ability = await (
        plugin().service('ability') as ReturnType<typeof abilityService>
      ).forUser(user, held);

      return (plugin().service('ability') as ReturnType<typeof abilityService>).describe({
        credentials: { documentId, roles: held },
        ability,
      });
    },
  };
};

export default userSecurityService;
