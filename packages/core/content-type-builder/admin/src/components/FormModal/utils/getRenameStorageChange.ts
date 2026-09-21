import { isStorageCompatibleRename } from '../../DataManager/utils/isStorageCompatibleRename';

import type { AnyAttribute, Status } from '../../../types';
import type { AttributeRenameMigrationMode } from '../../DataManager/RenameMigrationModal';

/** The loosely typed attribute data held by the form reducer (`FormModalData`). */
export type AttributeFormData = Record<string, unknown> & {
  name?: string;
  status?: Status;
  type?: string;
  relation?: string;
  target?: string | null;
  component?: string;
  repeatable?: boolean;
};

export interface RenameStorageChange {
  oldName: string;
  newName: string;
  /** Human label of the field's storage before the edit (e.g. `relation (oneToMany to api::tag.tag)`). */
  oldType: string;
  /** Human label of the field's storage after the edit. */
  newType: string;
}

/**
 * Human label for what defines an attribute's storage: the type, plus the
 * relation kind/target for relations and the component uid (+ repeatable) for
 * components, so a warning can say what changed.
 */
export const describeAttributeStorage = (attribute: AttributeFormData): string => {
  const type = attribute.type ?? 'unknown';

  if (type === 'relation') {
    const details = [attribute.relation, attribute.target ? `to ${attribute.target}` : undefined]
      .filter(Boolean)
      .join(' ');
    return details ? `${type} (${details})` : type;
  }

  if (type === 'component') {
    const details = [attribute.component, attribute.repeatable ? 'repeatable' : undefined]
      .filter(Boolean)
      .join(', ');
    return details ? `${type} (${details})` : type;
  }

  return type;
};

/**
 * Detects an attribute edit that renames an existing field *and* changes its
 * storage (type, relation kind/target, component uid/repeatable). Such a rename
 * cannot be replayed as a data-preserving migration, so the field is dropped
 * and recreated empty — the user should be warned before saving.
 *
 * Returns `null` when there is nothing to warn about: rename migrations are
 * disabled, the field is brand new (no data yet), the name did not change, or
 * the storage is unchanged.
 */
export const getRenameStorageChange = (
  initial: AttributeFormData,
  modified: AttributeFormData,
  mode: AttributeRenameMigrationMode
): RenameStorageChange | null => {
  if (mode === 'never' || initial.status === 'NEW') {
    return null;
  }

  const oldName = initial.name;
  const newName = modified.name;
  if (!oldName || !newName || oldName === newName) {
    return null;
  }

  if (
    isStorageCompatibleRename(
      initial as unknown as AnyAttribute,
      modified as unknown as AnyAttribute
    )
  ) {
    return null;
  }

  return {
    oldName,
    newName,
    oldType: describeAttributeStorage(initial),
    newType: describeAttributeStorage(modified),
  };
};
