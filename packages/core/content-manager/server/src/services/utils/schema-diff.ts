import { difference, omit } from 'lodash/fp';
import type { Struct } from '@strapi/types';

/**
 * Fields the Content Manager form never owns, so they are not part of a stored snapshot and must
 * not show up as a difference against the live content type.
 */
export const FIELDS_TO_IGNORE = [
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'strapi_stage',
  'strapi_assignee',
];

const pickAttributes = (keys: string[], source: Struct.SchemaAttributes) =>
  keys.reduce<Struct.SchemaAttributes>((attributes, key) => {
    attributes[key] = source[key];

    return attributes;
  }, {});

/**
 * Compares the schema a payload was stored against with the content type as it is now, so a
 * snapshot taken before a Content-Type Builder change can be told apart from a current one.
 *
 * `added` are attributes the content type gained since; `removed` are attributes the snapshot
 * still carries that the content type no longer has (removed or renamed).
 */
export const getSchemaAttributesDiff = (
  snapshotAttributes: Struct.SchemaAttributes,
  contentTypeAttributes: Struct.SchemaAttributes
) => {
  const sanitizedContentTypeAttributes = omit(FIELDS_TO_IGNORE, contentTypeAttributes);

  const snapshotKeys = Object.keys(snapshotAttributes);
  const contentTypeKeys = Object.keys(sanitizedContentTypeAttributes);

  return {
    added: pickAttributes(
      difference(contentTypeKeys, snapshotKeys),
      sanitizedContentTypeAttributes
    ),
    removed: pickAttributes(difference(snapshotKeys, contentTypeKeys), snapshotAttributes),
  };
};
