import type { MainField } from './attributes';
import type { RelationResult } from '../../../shared/contracts/relations';

/**
 * @internal
 * @description Get the label of a relation, the contract has [key: string]: unknown,
 * so we need to check if the mainFieldKey is defined and if the relation has a value
 * under that property. If it does, we then verify its type and return it.
 *
 * An empty string or null uses a neutral label instead of exposing the documentId. Other missing
 * or unsupported values fallback to the documentId.
 */
const getRelationLabel = (
  relation: RelationResult,
  mainField?: MainField,
  emptyLabel = 'Untitled'
): string => {
  const mainFieldValue = mainField ? relation[mainField.name] : undefined;

  if (mainFieldValue === '' || mainFieldValue === null) {
    return emptyLabel;
  }

  const label = mainFieldValue || null;

  if (typeof label === 'string') {
    return label;
  }

  // Return numeric labels except for the internal 'id' field.
  if (typeof label === 'number' && mainField?.name !== 'id') {
    return String(label);
  }

  return relation.documentId;
};

export { getRelationLabel };
