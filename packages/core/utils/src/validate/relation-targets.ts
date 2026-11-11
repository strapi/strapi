import { isPlainObject } from 'lodash';

import { hasDraftAndPublish } from '../content-types';
import { ValidationError } from '../errors';
import type { PermissionChecker } from '../content-api-permissions';
import type { EntryMatcher } from '../field-rules';
import type { Visitor } from '../traverse/factory';
import type { Model } from '../types';

/** An entry a write links to, as the body names it */
interface TargetReference {
  uid: string;
  documentId?: string;
  locale?: string;
  /** Named some other way (a numeric id): no condition can be checked on it */
  unchecked?: boolean;
}

/**
 * What a relation value links to: the items of `connect` and `set`, of a bare list, or a single
 * value. `disconnect` changes only the entry written, so it is not a link. Anything else is left
 * for the other validators and the Document Service to refuse.
 */
const referencesOf = (uid: string, value: unknown): TargetReference[] => {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => referencesOf(uid, item));
  }

  if (typeof value === 'string') {
    return [{ uid, documentId: value }];
  }

  if (typeof value === 'number') {
    return [{ uid, unchecked: true }];
  }

  if (!isPlainObject(value)) {
    return [];
  }

  const item = value as Record<string, unknown>;

  if ('connect' in item || 'set' in item || 'disconnect' in item) {
    return [...referencesOf(uid, item.connect), ...referencesOf(uid, item.set)];
  }

  if (typeof item.documentId === 'string') {
    return [
      {
        uid,
        documentId: item.documentId,
        locale: typeof item.locale === 'string' ? item.locale : undefined,
      },
    ];
  }

  if ('id' in item) {
    return [{ uid, unchecked: true }];
  }

  return [];
};

/**
 * Collects, while the entity traversal walks a write's body (components and dynamic zones
 * included), the entries its regular relations link to. Morph relations name their type per item
 * and are left to the route-level check.
 */
export const collectRelationTargets = (references: TargetReference[]): Visitor => {
  return ({ key, attribute, data }) => {
    if (attribute?.type !== 'relation' || !('target' in attribute) || !attribute.target) {
      return;
    }

    if (attribute.relation.startsWith('morph')) {
      return;
    }

    const value = (data as Record<string, unknown>)[key];

    references.push(...referencesOf(attribute.target as string, value));
  };
};

const notFound = (documentId: string, locale: string | undefined) =>
  // The words the Document Service uses for a document that is not there, so that a refusal tells
  // a caller nothing about the entries it may not read
  new ValidationError(`Document with id "${documentId}", locale "${locale ?? null}" not found`);

/**
 * Refuses a write that links to an entry the caller may not read. Linking changes the target too
 * (the other side of a two-way relation, or what a populate of the target shows), so an entry is
 * only linked when the caller could read it: published and under its `find` rows, or a draft under
 * its `read-drafts` rows. One that is not is answered like one that does not exist.
 *
 * For a caller whose checker is active only; `matcher` is the one core provides.
 */
export const assertRelationTargetsReadable = async ({
  references,
  checker,
  auth,
  matcher,
  getModel,
  locale,
}: {
  references: TargetReference[];
  checker: PermissionChecker;
  auth: unknown;
  matcher: EntryMatcher;
  getModel: (uid: string) => Model;
  locale?: string;
}): Promise<void> => {
  if (references.some((reference) => reference.unchecked)) {
    throw new ValidationError(
      'Relations must name the entries they link to by documentId when the caller has data permissions'
    );
  }

  const byGroup = new Map<string, { uid: string; locale?: string; documentIds: Set<string> }>();

  for (const reference of references) {
    const targetLocale = reference.locale ?? (locale === '*' ? undefined : locale);
    const groupKey = `${reference.uid}\u0000${targetLocale ?? ''}`;
    const group = byGroup.get(groupKey) ?? {
      uid: reference.uid,
      locale: targetLocale,
      documentIds: new Set<string>(),
    };

    group.documentIds.add(reference.documentId as string);
    byGroup.set(groupKey, group);
  }

  for (const { uid, locale: targetLocale, documentIds } of byGroup.values()) {
    const ids = [...documentIds];
    const readable = new Set<string>();
    const find = checker.filtersFor(auth, 'find', uid);

    if (find !== null) {
      const draftAndPublish = hasDraftAndPublish(getModel(uid));
      const published = await matcher({
        uid,
        documentIds: ids,
        filter: find,
        ...(draftAndPublish ? { status: 'published' as const } : {}),
        ...(targetLocale === undefined ? {} : { locale: targetLocale }),
      });

      for (const documentId of published) {
        readable.add(documentId);
      }

      const unread = ids.filter((documentId) => !readable.has(documentId));
      const drafts =
        draftAndPublish && unread.length > 0 && checker.canReadDrafts(auth, uid)
          ? checker.filtersFor(auth, 'read-drafts', uid)
          : null;

      if (drafts !== null) {
        const found = await matcher({
          uid,
          documentIds: unread,
          filter: drafts,
          status: 'draft',
          ...(targetLocale === undefined ? {} : { locale: targetLocale }),
        });

        for (const documentId of found) {
          readable.add(documentId);
        }
      }
    }

    const refused = ids.find((documentId) => !readable.has(documentId));

    if (refused !== undefined) {
      throw notFound(refused, targetLocale);
    }
  }
};
