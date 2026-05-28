import type { MainField, MediaField } from './attributes';
import type { RelationResult } from '../../../shared/contracts/relations';

/**
 * @internal
 * @description Get the label of a relation, the contract has [key: string]: unknown,
 * so we need to check if the mainFieldKey is defined and if the relation has a value
 * under that property. If it does, we then verify it's type of string and return it.
 *
 * We fallback to the documentId.
 */
const getRelationLabel = (relation: RelationResult, mainField?: MainField): string => {
  const label = mainField && relation[mainField.name] ? relation[mainField.name] : null;

  if (typeof label === 'string') {
    return label;
  }

  return relation.documentId;
};

interface RelationThumbnail {
  url: string;
  alt: string;
}

/**
 * @internal
 * @description Extract a thumbnail URL from a relation's media field.
 * Only returns a thumbnail for image files; non-images return undefined.
 */
const getRelationThumbnail = (
  relation: RelationResult,
  mediaField?: MediaField
): RelationThumbnail | undefined => {
  if (!mediaField) return undefined;

  const mediaValue = relation[mediaField.name];
  if (!mediaValue) return undefined;

  const media: any = Array.isArray(mediaValue) ? mediaValue[0] : mediaValue;
  if (!media || typeof media !== 'object') return undefined;
  if (!media.mime?.startsWith('image')) return undefined;

  return {
    url: media.formats?.thumbnail?.url || media.url,
    alt: media.alternativeText || '',
  };
};

export { getRelationLabel, getRelationThumbnail };
export type { RelationThumbnail };
