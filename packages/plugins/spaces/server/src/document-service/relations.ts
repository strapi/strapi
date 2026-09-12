import { errors } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';

import { SPACE_ATTRIBUTE, SPACE_UID } from '../../../shared/constants';
import { runUnscoped } from '../scope/context';

const { ApplicationError } = errors;

/** Every id a write points at, per target model. */
type Targets = Map<string, Set<string | number>>;

/**
 * Relation payload shapes the document service accepts, flattened to the ids
 * they name.
 *
 * `disconnect` is deliberately not followed: letting go of a link needs no
 * claim over the thing at the other end, and refusing it would make an entry
 * impossible to tidy up after its neighbour moved away.
 */
const targetIdsIn = (value: unknown): Array<string | number> => {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(targetIdsIn);
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return [value];
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;

    if ('set' in record || 'connect' in record) {
      return [...targetIdsIn(record.set), ...targetIdsIn(record.connect)];
    }

    if ('documentId' in record) {
      return [record.documentId as string];
    }

    if ('id' in record) {
      return [record.id as string | number];
    }
  }

  return [];
};

/**
 * Collects every relation and media target named in a write, including the ones
 * nested inside components and dynamic zones.
 */
const collect = (
  strapi: Core.Strapi,
  uid: string,
  data: Record<string, unknown> | undefined,
  targets: Targets,
  depth = 0
) => {
  const schema = strapi.getModel(uid as UID.Schema);

  if (!data || !schema || depth > 10) {
    return;
  }

  for (const [name, attribute] of Object.entries(schema.attributes ?? {})) {
    const value = data[name];

    if (value === undefined || name === SPACE_ATTRIBUTE) {
      continue;
    }

    const type = (attribute as { type?: string }).type;

    if (type === 'relation' || type === 'media') {
      const target =
        type === 'media'
          ? 'plugin::upload.file'
          : ((attribute as { target?: string }).target as string | undefined);

      // A polymorphic relation names its target per item rather than in the
      // schema. Those are left to the read side, where the query scope hides
      // whatever the caller may not see.
      if (!target || target === SPACE_UID) {
        continue;
      }

      const ids = targetIdsIn(value);

      if (ids.length > 0) {
        const bucket = targets.get(target) ?? new Set<string | number>();
        ids.forEach((id) => bucket.add(id));
        targets.set(target, bucket);
      }

      continue;
    }

    if (type === 'component') {
      const componentUid = (attribute as { component?: string }).component;
      const entries = Array.isArray(value) ? value : [value];

      if (componentUid) {
        entries.forEach((entry) =>
          collect(strapi, componentUid, entry as Record<string, unknown>, targets, depth + 1)
        );
      }

      continue;
    }

    if (type === 'dynamiczone' && Array.isArray(value)) {
      value.forEach((entry) => {
        const componentUid = (entry as Record<string, unknown>)?.__component as string | undefined;

        if (componentUid) {
          collect(strapi, componentUid, entry as Record<string, unknown>, targets, depth + 1);
        }
      });
    }
  }
};

/**
 * Refuses a write that would link an entry to content this space cannot reach.
 *
 * The query scope already hides the far end of such a link, so without this the
 * write would succeed and the relation would read back as missing. An entry
 * that quietly loses a relation is worse than a write that says why it cannot
 * be made.
 *
 * Rows that belong to no space are shared, and may always be linked to.
 */
export const assertRelationsWithinSpace = async (
  strapi: Core.Strapi,
  uid: string,
  data: Record<string, unknown> | undefined,
  spaceId: number
): Promise<void> => {
  const targets: Targets = new Map();
  collect(strapi, uid, data, targets);

  for (const [target, ids] of targets) {
    const schema = strapi.contentType(target as UID.ContentType);

    if (!schema?.attributes?.[SPACE_ATTRIBUTE] || ids.size === 0) {
      continue;
    }

    const values = [...ids];

    // Relations are addressed by document id in the document service and by row
    // id underneath it, and both shapes reach here. Asking for either in one
    // query avoids having to guess which one a caller used.
    const where = schema.attributes.documentId
      ? { $or: [{ documentId: { $in: values } }, { id: { $in: values } }] }
      : { id: { $in: values } };

    // Read past the caller's scope on purpose: the question is which space
    // these rows are in, and a scoped read could only ever answer "the
    // caller's" — it would hide the very rows being asked about.
    const rows = (await runUnscoped(() =>
      strapi.db.query(target as UID.ContentType).findMany({
        where,
        select: schema.attributes.documentId ? ['id', 'documentId'] : ['id'],
        populate: { [SPACE_ATTRIBUTE]: { select: ['id'] } },
        limit: -1,
      })
    )) as Array<Record<string, any>>;

    // What this space can legitimately point at: its own rows, and shared ones.
    const reachable = new Set<unknown>();

    for (const row of rows) {
      const owner = row[SPACE_ATTRIBUTE];
      const ownerId = owner && typeof owner === 'object' ? owner.id : owner;

      if (ownerId === null || ownerId === undefined || ownerId === spaceId) {
        reachable.add(row.id);
        reachable.add(String(row.id));

        if (row.documentId !== undefined) {
          reachable.add(row.documentId);
        }
      }
    }

    const unreachable = values.filter(
      (value) => !reachable.has(value) && !reachable.has(String(value))
    );

    // A target in another space and a target that does not exist are reported
    // the same way, on purpose. Telling them apart would answer "does row 412
    // exist somewhere I cannot see?" for anyone willing to ask often enough.
    if (unreachable.length > 0) {
      throw new ApplicationError(
        `This entry links to ${schema.info?.displayName ?? target} that is not available in this space. ` +
          `Entries can only link to content in their own space, or to content shared with every space.`
      );
    }
  }
};
