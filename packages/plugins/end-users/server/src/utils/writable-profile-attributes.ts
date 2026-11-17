import { contentTypes } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';

import { PROFILE_UID } from '../constants';

/**
 * Writable attributes Strapi adds to every content type. `getWritableAttributes` already leaves out
 * the ids and the timestamps; the creator fields are relations, which nothing outside the profile's
 * own owner ever writes.
 */
const STRAPI_ATTRIBUTES = new Set<string>([
  contentTypes.constants.PUBLISHED_AT_ATTRIBUTE,
  contentTypes.constants.FIRST_PUBLISHED_AT_ATTRIBUTE,
]);

/**
 * The profile attributes that something outside the profile's owner may write: a sign-up form
 * (registration fields) or a provider's claims (profile mapping). Plain values (no relations,
 * media, components or dynamic zones, which would attach the profile to other entries), writable,
 * not private (the Content API refuses those as input too), and never `user`, nor one of the
 * attributes Strapi adds to every content type. Attributes a project adds to the profile later show
 * up here by themselves.
 */
export const writableProfileAttributes = (strapi: Core.Strapi): string[] => {
  const schema = strapi.contentType(PROFILE_UID) as Struct.ContentTypeSchema;

  return contentTypes
    .getWritableAttributes(schema)
    .filter(
      (name) =>
        name !== 'user' &&
        !STRAPI_ATTRIBUTES.has(name) &&
        contentTypes.isScalarAttribute(schema.attributes[name]) &&
        !contentTypes.isPrivateAttribute(schema, name)
    );
};
