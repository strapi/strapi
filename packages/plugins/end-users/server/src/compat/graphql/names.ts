import type { Core, Struct } from '@strapi/types';

import {
  COMPAT_GRAPHQL_TYPE_NAMES,
  GRAPHQL_TYPE_NAMES,
  PROFILE_UID,
  ROLE_UID,
  USER_UID,
} from '../../constants';

/**
 * The GraphQL type names of the plugin's public types. With the compatibility mode on the user and
 * the role carry the names Users & Permissions gave (`UsersPermissionsUser`, `UsersPermissionsRole`
 * and, from them, every query, mutation, input and filter type); with it off they are `EndUser*`.
 * The profile keeps its name either way.
 */
export const graphqlTypeNames = (compat: boolean) =>
  compat ? COMPAT_GRAPHQL_TYPE_NAMES : GRAPHQL_TYPE_NAMES;

const NAMED_TYPES = [
  [USER_UID, 'user'],
  [ROLE_UID, 'role'],
  [PROFILE_UID, 'profile'],
] as const;

/**
 * Sets the type names of the registered content types. The role and the profile are written in
 * files, where the mode is not known, so they carry the stock names; this puts the names of the
 * compatibility names on all three, before the GraphQL schema is built from them.
 */
export const applyGraphqlTypeNames = (strapi: Core.Strapi, compat: boolean): void => {
  // The files carry the stock names
  if (!compat) {
    return;
  }

  const names = graphqlTypeNames(compat);

  for (const [uid, key] of NAMED_TYPES) {
    const schema = strapi.contentType(uid) as Struct.ContentTypeSchema | undefined;

    if (schema) {
      schema.pluginOptions = {
        ...schema.pluginOptions,
        graphql: { ...(schema.pluginOptions?.graphql as object), typeName: names[key] },
      };
    }
  }
};
