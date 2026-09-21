import type { AnyAttribute } from '../../../types';

/**
 * Whether `newAttribute` keeps the storage of `previousAttribute`, i.e. whether
 * renaming the underlying database artifact is enough to carry the data over.
 * A type change (or a relation retargeted, or a component swapped) must go
 * through the regular drop-and-recreate path: renaming the column and letting
 * schema sync alter its type in place can fail at startup on Postgres/MySQL.
 */
export const isStorageCompatibleRename = (
  previousAttribute: AnyAttribute,
  newAttribute: AnyAttribute
): boolean => {
  if (previousAttribute.type !== newAttribute.type) {
    return false;
  }

  if (previousAttribute.type === 'relation' && newAttribute.type === 'relation') {
    return (
      previousAttribute.relation === newAttribute.relation &&
      previousAttribute.target === newAttribute.target
    );
  }

  if (previousAttribute.type === 'component' && newAttribute.type === 'component') {
    return (
      previousAttribute.component === newAttribute.component &&
      Boolean(previousAttribute.repeatable) === Boolean(newAttribute.repeatable)
    );
  }

  return true;
};
