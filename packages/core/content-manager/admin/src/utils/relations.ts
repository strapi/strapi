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

  // Return numeric labels except for the internal 'id' field.
  if (typeof label === 'number' && mainField?.name !== 'id') {
    return String(label);
  }

  return relation.documentId;
};

interface MediaRendition {
  url: string;
  width?: number | null;
  height?: number | null;
}

interface RelationThumbnail {
  url: string;
  alt: string;
  /**
   * The rendition shown enlarged while the thumbnail is hovered.
   */
  zoom: MediaRendition;
}

interface MediaValue extends MediaRendition {
  alternativeText?: string | null;
  mime?: string;
  formats?: Record<string, MediaRendition | undefined> | null;
}

const isMediaValue = (value: unknown): value is MediaValue => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return typeof (value as { url?: unknown }).url === 'string';
};

/**
 * @internal
 * @description Extract a thumbnail URL from a relation's media field.
 * Only returns a thumbnail for image files; non-images return undefined.
 */
const getRelationThumbnail = (
  relation: RelationResult,
  mediaField?: MediaField
): RelationThumbnail | undefined => {
  if (!mediaField) {
    return undefined;
  }

  const mediaValue: unknown = relation[mediaField.name];
  const media = Array.isArray(mediaValue) ? mediaValue[0] : mediaValue;

  if (!isMediaValue(media) || !media.mime?.startsWith('image')) {
    return undefined;
  }

  // The medium format (750px) stays sharp at the zoom size on a 2x screen. An image too small
  // to get one is served as is.
  const zoom = media.formats?.medium ?? media;

  return {
    url: media.formats?.thumbnail?.url ?? media.url,
    alt: media.alternativeText ?? '',
    zoom: { url: zoom.url, width: zoom.width, height: zoom.height },
  };
};

export { getRelationLabel, getRelationThumbnail };
export type { MediaRendition, RelationThumbnail };
