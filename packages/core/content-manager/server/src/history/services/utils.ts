import { difference, omit } from 'lodash/fp';
import type { Struct } from '@strapi/types';
import { CreateHistoryVersion } from '../../../../shared/contracts/history-versions';
import { FIELDS_TO_IGNORE } from '../constants';

/**
 * Get the difference between the version schema and the content type schema
 * Returns the attributes with their original shape
 */
export const getSchemaAttributesDiff = (
  versionSchemaAttributes: CreateHistoryVersion['schema'],
  contentTypeSchemaAttributes: Struct.SchemaAttributes
) => {
  // Omit the same fields that were omitted when creating a history version
  const sanitizedContentTypeSchemaAttributes = omit(FIELDS_TO_IGNORE, contentTypeSchemaAttributes);

  const reduceDifferenceToAttributesObject = (
    diffKeys: string[],
    source: CreateHistoryVersion['schema']
  ) => {
    return diffKeys.reduce<CreateHistoryVersion['schema']>((previousAttributesObject, diffKey) => {
      previousAttributesObject[diffKey] = source[diffKey];

      return previousAttributesObject;
    }, {});
  };

  const versionSchemaKeys = Object.keys(versionSchemaAttributes);
  const contentTypeSchemaAttributesKeys = Object.keys(sanitizedContentTypeSchemaAttributes);
  // The attribute is new if it's on the content type schema but not on the version schema
  const uniqueToContentType = difference(contentTypeSchemaAttributesKeys, versionSchemaKeys);
  const added = reduceDifferenceToAttributesObject(
    uniqueToContentType,
    sanitizedContentTypeSchemaAttributes
  );
  // The attribute was removed or renamed if it's on the version schema but not on the content type schema
  const uniqueToVersion = difference(versionSchemaKeys, contentTypeSchemaAttributesKeys);
  const removed = reduceDifferenceToAttributesObject(uniqueToVersion, versionSchemaAttributes);

  return { added, removed };
};
