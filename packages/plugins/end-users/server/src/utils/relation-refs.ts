import { isPlain } from './is-plain';

/**
 * What a relation value in Document Service data points at, in every shape the service accepts for
 * it: a documentId, a numeric id, `{ documentId }` or `{ id }`, a list of those, and an object with
 * `connect` or `set` (which hold the same, a list or a lone value). Nothing here looks the target
 * up; it only reads what the caller wrote.
 *
 * `set` replaces whatever is there and `connect` adds to it, so a value that has a `set` is decided
 * by it alone, as it is in the Document Service. `disconnect` points at nothing a write adds.
 */
export interface RelationRef {
  documentId?: string;
  id?: number;
}

export const relationRefs = (value: unknown): RelationRef[] => {
  if (Array.isArray(value)) {
    return value.flatMap(relationRefs);
  }

  if (typeof value === 'string') {
    return value === '' ? [] : [{ documentId: value }];
  }

  if (typeof value === 'number') {
    return [{ id: value }];
  }

  if (!isPlain(value)) {
    return [];
  }

  if (typeof value.documentId === 'string' && value.documentId !== '') {
    return [{ documentId: value.documentId }];
  }

  if (typeof value.id === 'number') {
    return [{ id: value.id }];
  }

  if (value.set !== undefined && value.set !== null) {
    return relationRefs(value.set);
  }

  if (value.connect !== undefined && value.connect !== null) {
    return relationRefs(value.connect);
  }

  return [];
};
