import type { Core } from '@strapi/types';

import type { BuilderAttribute, BuilderLayout } from '../../../shared/contracts/conditions';
import { PROFILE_UID, ROLE_UID, USER_UID } from '../constants';
import {
  attributeOf,
  enumOf,
  filterableType,
  isPlain,
  isPrivate,
  relationOf,
  schemaOf,
} from '../utils/builder/check';
import { layoutContentTypeUids } from '../utils/layout-content-types';

type Plain = Record<string, unknown>;

/**
 * The attributes of a schema the builder can use: the public ones of a type it can filter on, and the
 * relations to a content type a path may go through. Private, password, media, component, dynamic zone
 * and morph attributes are left out.
 */
const attributesOf = (schema: Plain, offered: readonly string[]): BuilderAttribute[] => {
  const attributes: BuilderAttribute[] = [];

  for (const name of Object.keys(isPlain(schema.attributes) ? schema.attributes : {})) {
    const attribute = attributeOf(schema, name);

    if (attribute && !isPrivate(schema, name)) {
      const type = filterableType(attribute);
      const relation = relationOf(attribute);

      if (type) {
        const values = enumOf(attribute);

        attributes.push({ name, type, ...(values ? { enum: [...values] } : {}) });
      } else if (relation && offered.includes(relation.target)) {
        attributes.push({ name, type: 'relation', relation });
      }
    }
  }

  return attributes;
};

/**
 * What the builder page reads to offer fields (design m3): every content type a role can be granted
 * on, with the attributes a condition can use, the end user's and the profile's own, and the role
 * names. Read from the schemas, never from the role editor's layout.
 */
export const builderLayout = async (strapi: Core.Strapi): Promise<BuilderLayout> => {
  const offered = layoutContentTypeUids(strapi);
  const contentTypes: BuilderLayout['contentTypes'] = [];

  for (const uid of offered) {
    const schema = schemaOf(strapi, uid);

    if (schema) {
      const info = isPlain(schema.info) ? schema.info : {};
      const attributes = attributesOf(schema, offered);

      contentTypes.push({
        uid,
        displayName: typeof info.displayName === 'string' ? info.displayName : uid,
        kind: schema.kind === 'singleType' ? 'singleType' : 'collectionType',
        attributes,
        userRelations: attributes
          .filter(({ relation }) => relation?.target === USER_UID)
          .map(({ name }) => name),
      });
    }
  }

  const ownAttributes = (uid: string) => {
    const schema = schemaOf(strapi, uid);

    return schema ? attributesOf(schema, offered) : [];
  };
  const roles = (await strapi.db
    .query(ROLE_UID)
    .findMany({ select: ['name'], orderBy: { name: 'asc' } })) as Array<{ name: string }>;

  return {
    contentTypes,
    userAttributes: ownAttributes(USER_UID),
    profileAttributes: ownAttributes(PROFILE_UID),
    roles: roles.map(({ name }) => name),
  };
};

const builderLayoutService = ({ strapi }: { strapi: Core.Strapi }) => ({
  builderLayout: () => builderLayout(strapi),
});

export default builderLayoutService;
