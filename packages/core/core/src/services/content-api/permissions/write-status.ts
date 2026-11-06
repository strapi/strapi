import { contentTypes as contentTypesUtils, deniesAll, restrictsEntries } from '@strapi/utils';
import type { PermissionChecker } from '@strapi/utils';
import type { Core, Modules, UID } from '@strapi/types';

import { isSubjectAware } from './generate-ability';

type PermissionUtilities = Modules.ContentAPI.PermissionUtilities;

interface WriteStatusParams {
  strapi: Core.Strapi;
  checker: Pick<PermissionChecker, 'filtersFor' | 'record'>;
  entryMatches: PermissionUtilities['entryMatches'];
}

/**
 * Who may publish: a Content API write is a draft unless the caller holds `publish` on the type.
 *
 * Both functions do nothing for a caller whose ability is not subject-aware (API tokens, Users &
 * Permissions) or a type without draft & publish: those writes get the status they asked for, as
 * they do today.
 */
export const createWriteStatus = ({ strapi, checker, entryMatches }: WriteStatusParams) => {
  const hasDraftAndPublish = (uid: UID.ContentType) => {
    const contentType = strapi.contentType(uid);

    // The registry is a plain object: only a schema that names itself by the uid counts
    return contentType?.uid === uid && contentTypesUtils.hasDraftAndPublish(contentType);
  };

  const noteDraft = (auth: unknown, uid: UID.ContentType) =>
    checker.record(auth, { kind: 'write-as-draft', uid });

  const resolveWriteStatus: PermissionUtilities['resolveWriteStatus'] = async (auth, uid, opts) => {
    const { requested } = opts ?? {};

    if (!isSubjectAware(auth) || !hasDraftAndPublish(uid)) {
      return { status: requested, publishAfterCreate: false };
    }

    // Asked for, not forced: nothing to note
    if (requested === 'draft') {
      return { status: 'draft', publishAfterCreate: false };
    }

    const filters = checker.filtersFor(auth, 'publish', uid);

    // No `publish` row, or a held row none of whose conditions holds (the deny filter): `null` and
    // the deny filter both match no entry
    if (deniesAll(filters)) {
      noteDraft(auth, uid);

      return { status: 'draft', publishAfterCreate: false };
    }

    // An unconditioned row: the caller publishes anything, as the request says
    if (!restrictsEntries(filters)) {
      return { status: requested ?? 'published', publishAfterCreate: false };
    }

    // A conditioned row: write the draft, then publish it when it matches. A create has nothing
    // stored to match yet, and an update is judged on the draft as written (a write that changes a
    // condition field must not publish what the condition forbids), with the published version it
    // replaces: `publishIfAllowed`, in the transaction that writes the draft
    return { status: 'draft', publishAfterCreate: true };
  };

  const publishIfAllowed: PermissionUtilities['publishIfAllowed'] = async (
    auth,
    uid,
    documentId,
    opts
  ) => {
    if (!isSubjectAware(auth) || !hasDraftAndPublish(uid)) {
      return false;
    }

    const locale = opts?.locale;

    if (!(await entryMatches(auth, 'publish', uid, documentId, { locale }))) {
      // The draft the caller wrote stays one
      noteDraft(auth, uid);

      return false;
    }

    await strapi.documents(uid).publish({
      documentId,
      ...(locale === undefined ? {} : { locale }),
    });

    return true;
  };

  return { resolveWriteStatus, publishIfAllowed };
};
