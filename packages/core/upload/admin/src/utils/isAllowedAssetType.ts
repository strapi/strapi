import { ASSET_TYPES } from '../enums';

import type { Schema } from '@strapi/types';

/** A media field's `allowedTypes`, exactly as its schema can hold it. */
export type MediaAllowedTypes =
  Schema.Attribute.MediaProperties<Schema.Attribute.MediaKind>['allowedTypes'];

const MEDIA_KIND_BY_MIME_FAMILY: Record<string, Schema.Attribute.MediaKind> = {
  [ASSET_TYPES.Image]: 'images',
  [ASSET_TYPES.Video]: 'videos',
  [ASSET_TYPES.Audio]: 'audios',
};

/**
 * Whether an asset fits a media field's `allowedTypes`, by the same rule as the
 * legacy picker: only the MIME family (before the `/`) counts, and `files`
 * covers everything that is not an image, a video or an audio file.
 *
 * Not `typeFromMime`: it matches anywhere in the MIME type, so
 * `application/x-iso9660-image` would count as an image.
 *
 * No restriction (missing or empty) allows everything.
 */
export const isAllowedAssetType = (
  allowedTypes: MediaAllowedTypes | null,
  mime: string | null | undefined
): boolean => {
  const kinds = allowedTypes == null ? [] : [allowedTypes].flat();

  if (kinds.length === 0) {
    return true;
  }

  if (!mime) {
    return false;
  }

  return kinds.includes(MEDIA_KIND_BY_MIME_FAMILY[mime.split('/')[0]] ?? 'files');
};
