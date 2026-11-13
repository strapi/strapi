import type { UID } from '@strapi/types';
import { errors } from '@strapi/utils';

/**
 * An inverse morphOne / morphMany has a single target, the attribute's `target`, so its entries
 * need no `__type`. A `__type` naming another type is rejected rather than ignored, so a payload
 * meant for another type never links an entry of the schema target.
 */
const getInverseMorphTargetUid = (
  target: UID.Schema,
  relation: { __type?: unknown }
): UID.Schema => {
  if (relation.__type !== undefined && relation.__type !== null && relation.__type !== target) {
    throw new errors.ValidationError(
      `Invalid __type ${String(relation.__type)}, expected ${target}`
    );
  }

  return target;
};

export { getInverseMorphTargetUid };
