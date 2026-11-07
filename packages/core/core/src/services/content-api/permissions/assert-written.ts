import {
  contentTypes as contentTypesUtils,
  errors,
  restrictsEntries,
  withDeny,
} from '@strapi/utils';
import type { PermissionChecker } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import { isSubjectAware } from './generate-ability';

type PermissionUtilities = Modules.ContentAPI.PermissionUtilities;

interface WrittenCheckParams {
  strapi: Core.Strapi;
  checker: Pick<PermissionChecker, 'filtersFor'>;
}

const WRITE_ACTIONS = new Set<unknown>(['create', 'update']);

/**
 * The check on the data a Content API create or update wrote, which entry conditions on `create`
 * and `update` rows are about: a caller may write only what their conditions match once written.
 * Call it inside the transaction that wrote, after the write and before the commit: the error it
 * throws rolls the write back, so nothing may catch it, or an error of the write.
 *
 * It counts the written version (the written locale and status) with the caller's filters for the
 * action ANDed to `documentId` (the default locale when none is given), and throws a 403 `PolicyError` when none matches. A write is of one
 * version; a draft & publish write that publishes is judged once for the draft and once for the
 * published version, by the caller. It counts through `strapi.db.query`, never through
 * `strapi.db.connection`: SQLite has a pool of one connection, which the transaction holds.
 *
 * It does nothing for an ability that is not subject-aware (API tokens, Users & Permissions) and
 * when the caller's rows for the action have no entry filter. Deletes are not judged.
 */
export const createWrittenCheck = ({ strapi, checker }: WrittenCheckParams) => {
  const assertWritten: PermissionUtilities['assertWritten'] = async (
    auth,
    action,
    uid,
    documentId,
    scope
  ) => {
    // The types are erased at runtime: an action that isn't a write is refused for everyone
    if (!WRITE_ACTIONS.has(action)) {
      throw new errors.PolicyError('This change is outside what your role allows.');
    }

    // API tokens and Users & Permissions: route-level permission only, and no query
    if (!isSubjectAware(auth)) {
      return;
    }

    // The registry is a plain object: only a schema that names itself by the uid counts
    const contentType = strapi.contentType(uid);

    if (contentType?.uid !== uid) {
      throw new errors.PolicyError('This change is outside what your role allows.');
    }

    // `null` (a held row none of whose conditions holds) becomes the deny filter
    const filters = withDeny(checker.filtersFor(auth, action, uid));

    if (!restrictsEntries(filters)) {
      return;
    }

    const { status } = scope ?? {};
    const hasDraftAndPublish = contentTypesUtils.hasDraftAndPublish(contentType);

    // Without a written document there is nothing to match: fail closed
    if (typeof documentId !== 'string' || documentId === '') {
      throw new errors.PolicyError('This change is outside what your role allows.');
    }

    const where: Record<string, unknown> = { documentId, $and: [filters] };

    // The write names no locale when the request didn't: it went to the default one
    const locale =
      scope?.locale ||
      (strapi.localization.isLocalizedContentType(contentType)
        ? await strapi.localization.getDefaultLocale()
        : undefined);

    if (typeof locale === 'string' && locale !== '') {
      where.locale = locale;
    }

    if (hasDraftAndPublish) {
      where.publishedAt = status === 'published' ? { $notNull: true } : null;
    }

    const matching = await strapi.db.query(uid).count({ where });

    if (matching === 0) {
      throw new errors.PolicyError('This change is outside what your role allows.');
    }
  };

  return { assertWritten };
};
