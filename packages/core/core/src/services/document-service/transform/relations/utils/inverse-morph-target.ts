import type { UID } from '@strapi/types';
import { errors } from '@strapi/utils';

/**
 * An inverse morphOne / morphMany has a single target, the attribute's `target`, so its entries
 * need no `__type`. An entry whose `__type` names another type, or is not a string, is rejected
 * rather than ignored, whether the entry is given by `documentId` or by `id`.
 */
const getInverseMorphTargetUid = (
  target: UID.Schema,
  relation: { __type?: unknown }
): UID.Schema => {
  const { __type: type } = relation;

  if (type === undefined || type === null || type === target) {
    return target;
  }

  if (typeof type !== 'string') {
    throw new errors.ValidationError(`Invalid __type, expected ${target}`);
  }

  throw new errors.ValidationError(`Invalid __type ${type}, expected ${target}`);
};

export { getInverseMorphTargetUid };
