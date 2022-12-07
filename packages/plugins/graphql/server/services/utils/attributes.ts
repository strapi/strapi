import { Attribute, PolymorphicRelationsType, RelationAttribute } from '@strapi/strapi';
import { propEq } from 'lodash/fp';
import { StrapiCTX } from '../../types/strapi-ctx';

export default ({ strapi }: StrapiCTX) => {
  /**
   * Check if the given attribute is a Strapi scalar
   */
  const isStrapiScalar = (attribute: Attribute) => {
    return strapi.plugin('graphql').service('constants').STRAPI_SCALARS.includes(attribute.type);
  };

  /**
   * Check if the given attribute is a GraphQL scalar
   */
  const isGraphQLScalar = (attribute: Attribute) => {
    return strapi.plugin('graphql').service('constants').GRAPHQL_SCALARS.includes(attribute.type);
  };

  /**
   * Check if the given attribute is a polymorphic relation
   */
  const isMorphRelation = (attribute: RelationAttribute<never, PolymorphicRelationsType>) => {
    return isRelation(attribute) && attribute.relation.includes('morph');
  };

  // Check if the given attribute is a media
  const isMedia = propEq('type', 'media');

  // Check if the given attribute is a relation
  const isRelation = propEq('type', 'relation');

  // Check if the given attribute is an enum
  const isEnumeration = propEq('type', 'enumeration');

  // Check if the given attribute is a component
  const isComponent = propEq('type', 'component');

  // Check if the given attribute is a dynamic zone
  const isDynamicZone = propEq('type', 'dynamiczone');

  return {
    isStrapiScalar,
    isGraphQLScalar,
    isMorphRelation,
    isMedia,
    isRelation,
    isEnumeration,
    isComponent,
    isDynamicZone,
  };
};
