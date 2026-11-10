import { errors } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import { PROFILE_UID, USER_UID } from '../constants';
import { inProfileLifecycle } from '../utils/profile-lifecycle';
import { relationRefs } from '../utils/relation-refs';
import type { RelationRef } from '../utils/relation-refs';
import { isPlain } from '../utils/is-plain';

const MESSAGE = 'This user already has a profile';

/** What the Content API, GraphQL and the Content Manager are told */
const OWN_LIFE_MESSAGE = 'A profile is created and deleted with its user';

const refused = (message: string) =>
  new errors.ValidationError(message, {
    errors: [{ path: ['user'], message, name: 'ValidationError' }],
  });

const keyOf = ({ documentId, id }: RelationRef) =>
  documentId === undefined ? { id } : { documentId };

/** A stable order for the locks, so two writes naming the same users cannot wait on each other. */
const lockOrder = (refs: RelationRef[]) =>
  [...refs].sort((a, b) => {
    const left = String(a.documentId ?? a.id);
    const right = String(b.documentId ?? b.id);

    // eslint-disable-next-line no-nested-ternary
    return left < right ? -1 : left > right ? 1 : 0;
  });

/** What the gate could read of a relation value, and whether anything in it was beyond it */
interface StrictRefs {
  refs: RelationRef[];
  unparseable: boolean;
}

const NOT_A_REF: StrictRefs = { refs: [], unparseable: true };

/**
 * Reads one entry the way the gate needs it: a documentId string, a numeric id (a numeric string in
 * `{ id }` counts as one, as the database layer takes it), `{ documentId }` or `{ id }`. An entry
 * of any other shape is unparseable, and the gate treats it as a change: it cannot say whom it
 * names, so it cannot say it keeps the profile's user.
 */
const strictEntry = (entry: unknown): StrictRefs => {
  if (typeof entry === 'string') {
    return entry === '' ? NOT_A_REF : { refs: [{ documentId: entry }], unparseable: false };
  }

  if (typeof entry === 'number') {
    return Number.isInteger(entry) ? { refs: [{ id: entry }], unparseable: false } : NOT_A_REF;
  }

  if (!isPlain(entry)) {
    return NOT_A_REF;
  }

  const ref: RelationRef = {};

  if ('documentId' in entry) {
    if (typeof entry.documentId !== 'string' || entry.documentId === '') {
      return NOT_A_REF;
    }

    ref.documentId = entry.documentId;
  }

  if ('id' in entry) {
    const id = typeof entry.id === 'string' && /^\d+$/.test(entry.id) ? Number(entry.id) : entry.id;

    if (typeof id !== 'number' || !Number.isInteger(id)) {
      return NOT_A_REF;
    }

    ref.id = id;
  }

  return ref.documentId === undefined && ref.id === undefined
    ? NOT_A_REF
    : { refs: [ref], unparseable: false };
};

/** A lone entry or a list of them; one entry that cannot be read spoils the whole value. */
const strictRefs = (value: unknown): StrictRefs => {
  const entries = Array.isArray(value) ? value : [value];
  const refs: RelationRef[] = [];

  for (const entry of entries) {
    const read = strictEntry(entry);

    if (read.unparseable) {
      return NOT_A_REF;
    }

    refs.push(...read.refs);
  }

  return refs.length === entries.length ? { refs, unparseable: false } : NOT_A_REF;
};

/** Every field a ref states must name the user: the Content Manager may send both back */
const names = (ref: RelationRef, user: { id?: number; documentId?: string }) =>
  (ref.documentId === undefined || ref.documentId === user.documentId) &&
  (ref.id === undefined || ref.id === user.id);

/**
 * Whether an update's `user` value would leave the profile with another user, or none. A value that
 * only restates the profile's own user (the Content Manager sends the whole entry back) or changes
 * nothing (`{ connect: [], disconnect: [] }`) is no change. It fails closed: an entry the gate
 * cannot read is a change.
 */
const changesUser = (value: unknown, current: { id?: number; documentId?: string }): boolean => {
  // A list that is not empty, all of it the profile's own user
  const keepsUser = (list: unknown, { mayBeEmpty }: { mayBeEmpty: boolean }) => {
    if (list === undefined || list === null) {
      return mayBeEmpty;
    }

    const { refs, unparseable } = strictRefs(list);

    if (unparseable) {
      return false;
    }

    return refs.length === 0 ? mayBeEmpty : refs.every((ref) => names(ref, current));
  };

  if (value === null) {
    return true;
  }

  // A plain value, a list or `{ documentId }`: it is the new user, and an empty one unlinks
  if (!isPlain(value) || 'documentId' in value || 'id' in value) {
    return !keepsUser(value, { mayBeEmpty: false });
  }

  // Any disconnect entry, readable or not, takes the user away or may
  if (
    value.disconnect !== undefined &&
    value.disconnect !== null &&
    !(Array.isArray(value.disconnect) && value.disconnect.length === 0)
  ) {
    return true;
  }

  // `set` decides alone, and an empty one unlinks; an empty `connect` adds nothing
  if (value.set !== undefined && value.set !== null) {
    return !keepsUser(value.set, { mayBeEmpty: false });
  }

  return !keepsUser(value.connect, { mayBeEmpty: true });
};

/**
 * `one-profile-per-user`: a user has one profile, and the profile has no life of its own (Decision
 * 19). It is made with its user (`create-profile`) and removed with it (`cascade-user-delete`), and
 * nothing else may create or delete one, or hand it to another user. The Content API, GraphQL and
 * the Content Manager all reach the profile through the Document Service, so the refusal is here:
 * a `create`, `delete` or `clone`, and an `update` that changes the `user`, are answered 400 'A
 * profile is created and deleted with its user'. The plugin's own creates and deletes are marked
 * (`utils/profile-lifecycle`, an `AsyncLocalStorage` context only they enter) and pass.
 *
 * The relation from the profile to the user is a link table, which cannot carry a unique
 * constraint of its own (its only index is `(profile_id, user_id)`, and none can be declared on
 * it), so a marked create is still checked: the profile a start makes for a user who has none
 * (`ensureEveryUserHasAProfile`) can run on two instances at once.
 *
 * The check and the write run in one transaction that first locks the row of the user the write
 * names (`SELECT ... FOR UPDATE`, as the adapter's `lockRow` does). Two creates for one user meet
 * at that lock: the second waits for the first to commit, then runs its check and finds the
 * profile. SQLite serializes writers inside a transaction itself, so the lock is nothing there.
 * Called inside a transaction already (`create-profile` runs inside the user's own create), the
 * work joins it, and the user's row is already held by it.
 */
export const oneProfilePerUserMiddleware =
  (strapi: Core.Strapi): Modules.Documents.Middleware.Middleware =>
  async (ctx, next) => {
    if (ctx.uid !== PROFILE_UID) {
      return next();
    }

    const params = ctx.params as
      { documentId?: string; data?: Record<string, unknown> | null } | undefined;
    const data = params?.data ?? undefined;

    if (inProfileLifecycle()) {
      // The plugin's own create is checked below; its own delete needs nothing more
      if (ctx.action !== 'create') {
        return next();
      }
    } else if (ctx.action === 'delete' || ctx.action === 'create' || ctx.action === 'clone') {
      throw refused(OWN_LIFE_MESSAGE);
    } else if (ctx.action === 'update' && data && 'user' in data) {
      const current = params?.documentId
        ? await strapi.db.query(PROFILE_UID).findOne({
            where: { documentId: params.documentId },
            populate: { user: { select: ['id', 'documentId'] } },
          })
        : null;

      // A profile that is not there fails on its own
      if (current && changesUser(data.user, current.user ?? {})) {
        throw refused(OWN_LIFE_MESSAGE);
      }

      return next();
    }

    if (ctx.action !== 'create' || !data || !('user' in data)) {
      return next();
    }

    const refs = relationRefs(data.user);

    if (refs.length === 0) {
      return next();
    }

    return strapi.db.transaction(async () => {
      // Lock first, check second: the check must see what the transaction that held the lock wrote.
      // A user that is not there has no row to lock, and the write fails on its own connecting it.
      for (const ref of lockOrder(refs)) {
        // eslint-disable-next-line no-await-in-loop
        await strapi.db
          .queryBuilder(USER_UID)
          .select('id')
          .where(keyOf(ref))
          .first()
          .forUpdate()
          .execute();
      }

      for (const ref of refs) {
        // eslint-disable-next-line no-await-in-loop
        const existing = await strapi.db
          .query(PROFILE_UID)
          .findOne({ where: { user: keyOf(ref) }, select: ['id'] });

        if (existing) {
          throw refused(MESSAGE);
        }
      }

      return next();
    });
  };
