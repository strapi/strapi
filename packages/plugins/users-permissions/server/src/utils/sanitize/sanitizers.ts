import _ from 'lodash';
import { traverseEntity } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';
import { removeUserRelationFromRoleEntities } from './visitors';

const { curry } = _;

type Schema = Parameters<typeof traverseEntity>[1]['schema'];

/** Remove user relations on role entities, using the supplied instance to traverse relations. */
const sanitizeUserRelationFromRoleEntities = curry(
  (strapi: Core.Strapi, schema: Schema, entity: Parameters<typeof traverseEntity>[2]) =>
    traverseEntity(
      removeUserRelationFromRoleEntities,
      { schema, getModel: (uid) => strapi.getModel(uid as UID.Schema) },
      entity
    )
);

/** Apply users-permissions output sanitizers without mutating the input entity. */
const defaultSanitizeOutput = sanitizeUserRelationFromRoleEntities;
export { sanitizeUserRelationFromRoleEntities, defaultSanitizeOutput };
