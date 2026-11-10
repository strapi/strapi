import type { Core, Modules } from '@strapi/types';

import { PLUGIN_ID, PROFILE_UID, USER_UID, VERIFICATION_UID } from '../constants';
import { singularNameOf } from '../engine/better-auth/model-names';
import type { AuthEngine } from '../engine/types';
import { asProfileLifecycle } from '../utils/profile-lifecycle';
import { contentTypesOf, documentsOf, queryOf, type PluginDocuments } from '../utils/typed-strapi';

interface Reference {
  uid: string;
  attribute: string;
}

type Query = {
  deleteMany(params: { where: Record<string, unknown> }): Promise<unknown>;
};

/**
 * The columns that hold a user's `documentId`: every field of every table the engine has that
 * references the user (`session.userId`, `account.userId`, `twoFactor.userId`, a passkey's, and
 * whatever the project's Better Auth plugins add). They are plain columns, not relations, so
 * nothing in the database removes their rows with the user.
 */
const userReferences = (strapi: Core.Strapi, engine: AuthEngine): Reference[] => {
  const references: Reference[] = [];

  for (const table of engine.schema()) {
    if (table.disableMigrations || table.name === 'user') {
      // eslint-disable-next-line no-continue
      continue;
    }

    const uid = `plugin::${PLUGIN_ID}.${singularNameOf(table.name)}`;

    for (const [key, field] of Object.entries(table.fields)) {
      const attribute = field.fieldName ?? key;

      if (
        field.references?.model === 'user' &&
        field.references.field === 'id' &&
        // Never a delete on a column Strapi would not know: it drops a filter on an unknown
        // attribute, and the delete would then match every row
        contentTypesOf<Record<string, { attributes?: Record<string, unknown> }>>(strapi)[uid]
          ?.attributes?.[attribute]
      ) {
        references.push({ uid, attribute });
      }
    }
  }

  return references;
};

/**
 * `cascade-user-delete`: deleting a user deletes what belongs to it, in the same transaction:
 *
 * - its profile (through the Document Service, so the profile's components and media go too),
 * - its sessions, accounts, two-factor record, passkeys and whatever else the engine keeps by user,
 * - the verification rows that hold the user's `documentId` (password reset tokens and trusted
 *   devices; the ones keyed by an email address expire by themselves).
 *
 * Without it a deleted user would leave a credential account behind, and the next request with one
 * of its sessions would be answered by a row that belongs to nobody. The Content API strategy
 * refuses a session whose user is gone (401), so nothing can sign in as the user in the meantime;
 * this is what stops the rows piling up and what keeps a personal record from outliving its person.
 *
 * The profile goes first: once the user row is gone the link that finds it is gone too. Its delete
 * is marked as the plugin's own (`asProfileLifecycle`): `one-profile-per-user` refuses any other.
 */
export const cascadeUserDeleteMiddleware =
  (strapi: Core.Strapi): Modules.Documents.Middleware.Middleware =>
  async (ctx, next) => {
    if (ctx.uid !== USER_UID || ctx.action !== 'delete') {
      return next();
    }

    const { documentId } = (ctx.params ?? {}) as { documentId?: string };

    // Never a filter on a missing id: Strapi drops it, and the delete would match every row
    if (typeof documentId !== 'string' || documentId === '') {
      return next();
    }

    const engine = strapi.plugin(PLUGIN_ID).service('engine').get() as AuthEngine;
    const query = (uid: string) => queryOf<Query>(strapi, uid);

    return strapi.db.transaction(async () => {
      const profiles = (await documentsOf<PluginDocuments>(strapi, PROFILE_UID).findMany({
        filters: { user: { documentId } },
        fields: ['documentId'],
      })) as Array<{ documentId: string }>;

      /* eslint-disable no-await-in-loop -- deleted in order, inside one transaction on a single connection */
      for (const profile of profiles) {
        await asProfileLifecycle(() =>
          strapi.documents(PROFILE_UID).delete({ documentId: profile.documentId })
        );
      }
      /* eslint-enable no-await-in-loop */

      /* eslint-disable no-await-in-loop -- deleted in order, inside one transaction on a single connection */
      for (const { uid, attribute } of userReferences(strapi, engine)) {
        await query(uid).deleteMany({ where: { [attribute]: documentId } });
      }
      /* eslint-enable no-await-in-loop */

      await query(VERIFICATION_UID).deleteMany({ where: { value: documentId } });

      return next();
    });
  };
