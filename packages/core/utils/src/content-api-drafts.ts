import { hasDraftAndPublish, isMorphToRelationalAttribute } from './content-types';
import { deniesAll, restrictsEntries, type PermissionChecker } from './content-api-permissions';
import type { AnyAttribute, Model } from './types';

/**
 * What the Content API's drafts gate reads from a query, shared by `validate.query` (which answers
 * 403 `DRAFT_READ_FORBIDDEN`) and `sanitize.query` (which removes the draft params and restricts
 * what a draft read reaches). A caller needs a `read-drafts` row on a draft-and-publish type to
 * read its drafts, or to filter it by what drafts and published versions it has.
 */

/** How a query reads drafts, if it does */
export interface DraftRead {
  /**
   * `status` asks for drafts: the query holds the key with anything but `'published'` (`undefined`,
   * `null` and `''` included). The core service spreads the query over its `'published'` default,
   * and the Document Service reads every status but `'published'` as `'draft'`.
   */
  status: boolean;
  /**
   * `hasPublishedVersion` or `publicationFilter` is set (not `undefined` or `null`, which the
   * Document Service ignores): it filters entries by the drafts and published versions they have.
   */
  publication: boolean;
}

/** A query that reads no drafts */
export const NO_DRAFT_READ: DraftRead = Object.freeze({ status: false, publication: false });

const isSet = (value: unknown) => value !== undefined && value !== null;

export const draftReadOf = (query: Record<string, unknown>): DraftRead => ({
  status: Object.prototype.hasOwnProperty.call(query, 'status') && query.status !== 'published',
  publication: isSet(query.hasPublishedVersion) || isSet(query.publicationFilter),
});

export const readsDrafts = (read: DraftRead) => read.status || read.publication;

/**
 * How a related type is reached. `populate` loads it with the root's status and publication filter
 * (both go through the query layer's `filters`, which every populate query applies to its own
 * type). A `filter` or a sort joins it through the links, and links follow the status: a draft
 * links to drafts, a published version to published versions.
 */
export type DraftVia = 'populate' | 'filter';

/** Whether drafts of a draft-and-publish type reached this way are read */
export const draftsReach = (read: DraftRead, via: DraftVia) =>
  read.status || (via === 'populate' && read.publication);

/**
 * Which versions of a draft-and-publish type a relation filter or a sort reaches when it joins it
 * from some rows, in a query that does not read drafts by its `status`. The query layer
 * applies the status to the root and to each populated type, never to a join, and a relation's
 * links follow the type that holds them (a component's are its entry's):
 * - `published`: rows of a draft-and-publish type, published versions only. They link to
 *   published versions.
 * - `drafts`: rows of a draft-and-publish type, drafts among them. Drafts link to drafts.
 * - `unversioned`: rows of a type without draft & publish. They link to both versions of a
 *   draft-and-publish type (`getRelationTargetStatus`), so `filters[articles][title]` on folders
 *   matches the title of a draft.
 */
export type JoinReach = 'published' | 'drafts' | 'unversioned';

/**
 * The reach of the rows of a query's root, or of a populated node, outside a draft read: the query
 * layer gives every draft-and-publish type it reads that way the published status. A component
 * holds its entry's links, so it takes `inherited`. An unknown type is read as `unversioned`, which
 * restricts the most.
 */
export const reachOf = (model: Model | undefined, inherited: JoinReach): JoinReach => {
  if (model === undefined) {
    return 'unversioned';
  }

  if (model.modelType === 'component') {
    return inherited;
  }

  return hasDraftAndPublish(model) ? 'published' : 'unversioned';
};

/** Whether a relation from rows of this reach into `target` joins drafts of it */
export const joinsDrafts = (reach: JoinReach, target: Model | undefined): boolean =>
  reach !== 'published' && target !== undefined && hasDraftAndPublish(target);

/** Where a relation filter or sort is joined from: the rows' type, and their reach */
export interface JoinStep {
  model: Model | undefined;
  reach: JoinReach;
}

const FILE_UID = 'plugin::upload.file';

/**
 * Walks a filter or sort path (attribute names), from rows of `start`, as the query layer joins
 * it, and gives the type and reach of the rows at its end. A relation into a draft-and-publish type
 * that {@link joinsDrafts} keeps the drafts the caller may read (`mayReadDrafts`: a published-only
 * clause keeps out those of a caller who may not). A component keeps the reach, media has no
 * versions. A path it can't follow (a morph relation, a dynamic zone, an unknown key) ends
 * `unversioned`, which restricts the most.
 */
export const createJoinWalk = (
  getModel: (uid: string) => Model | undefined,
  mayReadDrafts: (uid: string) => boolean
) => {
  const UNKNOWN: JoinStep = { model: undefined, reach: 'unversioned' };

  const step = ({ model, reach }: JoinStep, key: string): JoinStep => {
    const attribute = model?.attributes?.[key] as AnyAttribute | undefined;

    if (
      attribute?.type === 'relation' &&
      !isMorphToRelationalAttribute(attribute) &&
      typeof attribute.target === 'string'
    ) {
      const target = getModel(attribute.target);

      if (target === undefined || !hasDraftAndPublish(target)) {
        return { model: target, reach: 'unversioned' };
      }

      const keepsDrafts = joinsDrafts(reach, target) && mayReadDrafts(attribute.target);

      return { model: target, reach: keepsDrafts ? 'drafts' : 'published' };
    }

    if (attribute?.type === 'component') {
      return { model: getModel(attribute.component), reach };
    }

    if (attribute?.type === 'media') {
      return { model: getModel(FILE_UID), reach: 'unversioned' };
    }

    return UNKNOWN;
  };

  return (start: JoinStep, path: string[]): JoinStep =>
    path.reduce((at, key) => (at.model === undefined ? UNKNOWN : step(at, key)), start);
};

/**
 * The attribute names of a visited key's `path.attribute` that lead to the rows it is joined from:
 * all but the key itself, without the `prefix` the traversal started at (a populate node's path).
 * Pass `holdsKey: false` for a key that is not an attribute (`$not`), whose path ends at its rows.
 */
export const joinPathOf = (
  attributePath: string | null | undefined,
  prefix: string | null | undefined,
  holdsKey = true
): string[] => {
  let path = attributePath ?? '';

  if (prefix && path === prefix) {
    path = '';
  } else if (prefix && path.startsWith(`${prefix}.`)) {
    path = path.slice(prefix.length + 1);
  }

  const segments = path === '' ? [] : path.split('.');

  return holdsKey ? segments.slice(0, -1) : segments;
};

/**
 * The actions that write. Their query's `status` says what is written (a draft, or a published
 * version), and their response shows the written entry, so the drafts gate leaves their root alone
 *. The draft-and-publish types a write reaches through populate,
 * filters and sorts are gated as a read's are: the written entry is the writer's, its
 * relations' drafts are not.
 */
export const isWriteAction = (action: string | undefined) =>
  action === 'create' || action === 'update' || action === 'delete';

/**
 * Whether the caller may read drafts of a type, asked once per uid for the life of the returned
 * function: a held `read-drafts` row whose filter can match an entry. The answer comes from the
 * held rows (`canReadDrafts`) and the filter (`deniesAll`), never from `filtersFor(…) !== null`:
 * the deny filter of a row whose conditions all fail is not null.
 *
 * `readDraftsFilters` gives the caller's `read-drafts` filters for a uid; pass it to share answers
 * the caller already asked for (`withDeny` of them is fine: it denies exactly when they do).
 */
export const createDraftReadPermission = (
  checker: PermissionChecker,
  auth: unknown,
  readDraftsFilters: (uid: string) => Record<string, unknown> | null = (uid) =>
    checker.filtersFor(auth, 'read-drafts', uid)
): ((uid: string) => boolean) => {
  const answers = new Map<string, boolean>();

  return (uid) => {
    let answer = answers.get(uid);

    if (answer === undefined) {
      answer = checker.canReadDrafts(auth, uid) && !deniesAll(readDraftsFilters(uid));
      answers.set(uid, answer);
    }

    return answer;
  };
};

/**
 * Whether reading drafts of a type through a relation is restricted for the caller: the type has
 * draft & publish and the caller's `read-drafts` filter restricts entries (no row at all counts).
 * Asked once per uid for the life of the returned function.
 */
export const createDraftRelationRestriction = (
  checker: PermissionChecker,
  auth: unknown,
  getModel: (uid: string) => Model | undefined
): ((uid: string) => boolean) => {
  const answers = new Map<string, boolean>();

  return (uid) => {
    let answer = answers.get(uid);

    if (answer === undefined) {
      const model = getModel(uid);

      answer =
        model !== undefined &&
        hasDraftAndPublish(model) &&
        restrictsEntries(checker.filtersFor(auth, 'read-drafts', uid));
      answers.set(uid, answer);
    }

    return answer;
  };
};
