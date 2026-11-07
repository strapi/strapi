import { contentTypes as contentTypesUtils, errors, withDeny } from '@strapi/utils';
import type { PermissionChecker } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import { isSubjectAware } from './generate-ability';

type PermissionUtilities = Modules.ContentAPI.PermissionUtilities;

type Status = 'draft' | 'published';

/** The `locale` of a Document Service call: one locale, `'*'` for all of them, or a list */
type Locale = string | string[];

interface EntryCheckParams {
  strapi: Core.Strapi;
  checker: Pick<PermissionChecker, 'filtersFor'>;
}

/** The actions a write can be checked for. Anything else is not one, whatever the types say */
const ENTRY_ACTIONS = new Set<unknown>(['update', 'delete', 'publish']);

/**
 * A `locale` that names a scope the Document Service resolves: missing (the default locale), one
 * locale, `'*'` or a list of locales. Anything else (`null`, a number, an object, a list holding
 * one) names none, so there is nothing to check an entry against.
 */
const isLocale = (locale: unknown): locale is Locale | undefined =>
  locale === undefined ||
  typeof locale === 'string' ||
  (Array.isArray(locale) && locale.every((item) => typeof item === 'string'));

/**
 * The stored-entry check before a Content API write. The Document Service's `update` and `delete`
 * ignore `filters`, so without it a caller could update or delete an entry they can't see.
 *
 * `entryMatches` counts the document's stored versions with the caller's filters for (action, uid)
 * ANDed to `documentId`, and without them, and compares. The counts are of versions, not of joined
 * rows: a condition on a to-many relation joins it, and a version with two matching related rows
 * would count twice and make up for one that matches nothing. What keeps them to one per version is
 * the query builder, which counts `distinct id` as soon as a query joins; that is pinned by
 * `count-relation-filter.vitest.test.ts` in `@strapi/database`.
 *
 * The filters are what `checker.filtersFor` gives: a pair the caller holds no row for is
 * route-level only (`{}`), and `null` (`publish` without a row, a held row whose conditions all
 * fail) becomes the deny filter through `withDeny`, so it never matches. They are never sanitized:
 * they are the resolved conditions, which may name private fields.
 *
 * Which versions are compared is what the write itself touches, and the lookups go through the
 * Document Service with the caller's `locale`, so the scope is the write's own (the default locale
 * when none is given, `'*'` for every locale, a list for those) and not a second reading of it:
 * - `delete` removes every stored version in scope, draft and published, so each must match.
 * - `publish` replaces the published version with the draft, so the draft and the published version
 *   in scope must each match: a caller who owns the draft must not take over a published version
 *   that names someone else.
 * - `update` writes the draft of a draft & publish type (the only version of a type without it), so
 *   each of those in scope must match. A published version is a snapshot: what decides who may
 *   update is the draft, which is where an owner can be changed. An update that also publishes is
 *   checked as a `publish` as well, by whoever publishes it.
 * - an `update` of a single locale the document has no entry in creates it from the document's
 *   other drafts, so it is allowed when every draft of the document, in every locale, matches: the
 *   caller must be allowed to write the whole document, not only one of its locales. Published
 *   versions do not count, and a document with no draft is not one the caller can write.
 */
export const createEntryCheck = ({ strapi, checker }: EntryCheckParams) => {
  const entryMatches: PermissionUtilities['entryMatches'] = async (
    auth,
    action,
    uid,
    documentId,
    opts
  ) => {
    // Anything but `delete` and `publish` is read as an `update`, so a typo or a custom action would
    // be checked against the drafts and let through. The types are erased at runtime: refuse it
    // for every caller, tokens included, so a wrong call shows the same everywhere
    if (!ENTRY_ACTIONS.has(action)) {
      return false;
    }

    // API tokens and Users & Permissions: route-level permission only, and no query
    if (!isSubjectAware(auth)) {
      return true;
    }

    // `{ documentId: undefined }` or an operator object would not name one entry
    if (typeof documentId !== 'string' || documentId === '') {
      return false;
    }

    // The registry is a plain object: only a schema that names itself by the uid counts
    const contentType = strapi.contentType(uid);

    if (contentType?.uid !== uid) {
      return false;
    }

    const locale: unknown = opts?.locale;

    if (!isLocale(locale)) {
      return false;
    }

    // The checker's filters are Strapi query syntax with no schema type of their own
    const filters = withDeny(checker.filtersFor(auth, action, uid));

    // A draft & publish document stores a draft and a published version per locale, which the
    // Document Service tells apart by status. Without it there is one version and no status.
    const hasDraftAndPublish = contentTypesUtils.hasDraftAndPublish(contentType);
    const drafts: Array<Status | undefined> = hasDraftAndPublish ? ['draft'] : [undefined];
    const versions: Array<Status | undefined> = hasDraftAndPublish
      ? ['draft', 'published']
      : [undefined];

    /**
     * How many stored versions of the document, of these statuses and in this locale scope, there
     * are: the ones the caller's filters match, or all of them
     */
    const countVersions = async (
      statuses: Array<Status | undefined>,
      scope: Locale | undefined,
      onlyMatching: boolean
    ) => {
      const where = (
        onlyMatching ? { $and: [{ documentId }, filters] } : { documentId }
      ) as Modules.Documents.Params.Filters.Any<typeof uid>;

      const counts = await Promise.all(
        statuses.map((status) =>
          strapi.documents(uid).count({
            filters: where,
            ...(status === undefined ? {} : { status }),
            ...(scope === undefined ? {} : { locale: scope }),
          })
        )
      );

      return counts.reduce((sum, count) => sum + count, 0);
    };

    if (action === 'delete' || action === 'publish') {
      // None match: refused, or there is nothing to delete or publish (a missing document looks the
      // same)
      const matching = await countVersions(versions, locale, true);

      if (matching === 0) {
        return false;
      }

      // One version the filters refuse is enough to refuse the delete that would remove it, or the
      // publish that would replace it
      return matching === (await countVersions(versions, locale, false));
    }

    const matching = await countVersions(drafts, locale, true);

    if (matching > 0) {
      return matching === (await countVersions(drafts, locale, false));
    }

    // A list or '*' names no one locale to add
    if (locale === '*' || Array.isArray(locale)) {
      return false;
    }

    // The entry is there and the filters refuse it
    if ((await countVersions(drafts, locale, false)) > 0) {
      return false;
    }

    // Nothing in the locale: the update adds it to the document, copying from its other drafts, so
    // all of them must be the caller's to write. One that isn't is another owner's document, and
    // none at all (matching or not) is a document that doesn't exist.
    const matchingDrafts = await countVersions(drafts, '*', true);

    return matchingDrafts > 0 && matchingDrafts === (await countVersions(drafts, '*', false));
  };

  const assertEntry: PermissionUtilities['assertEntry'] = async (...args) => {
    if (!(await entryMatches(...args))) {
      // What Strapi answers for a document that doesn't exist (`ctx.notFound()`), word for word, so
      // a caller can't tell one they may not write from one that isn't there
      throw new errors.NotFoundError('Not Found');
    }
  };

  return { entryMatches, assertEntry };
};
