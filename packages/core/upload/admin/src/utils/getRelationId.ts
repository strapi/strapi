/**
 * Normalise a to-one relation down to its id.
 *
 * The contracts type `File['folder']` and `Folder['parent']` as ids, but the
 * admin populates both (`populate: { folder: true }` on `/upload/files`,
 * `populate: { parent: true }` on `/upload/folders`), so the wire value is an
 * object. Only the id is ever read — move validation compares locations by id.
 */
export const getRelationId = (
  relation: number | string | { id?: number } | null | undefined
): number | null => {
  if (relation == null) {
    return null;
  }

  if (typeof relation === 'object') {
    return relation.id ?? null;
  }

  if (typeof relation === 'number') {
    return relation;
  }

  return Number(relation) || null;
};
