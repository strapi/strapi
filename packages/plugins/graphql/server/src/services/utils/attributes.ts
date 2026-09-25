import { propEq } from 'lodash/fp';
import type { Schema } from '@strapi/types';
import type { Context } from '../types';

export default ({ strapi }: Context) => {
  /**
   * Check if the given attribute is a Strapi scalar
   * @param {object} attribute
   * @return {boolean}
   */
  const isStrapiScalar = (attribute: Pick<Schema.Attribute.AnyAttribute, 'type'>) => {
    const { STRAPI_SCALARS } = strapi.plugin('graphql').service('constants');

    return (STRAPI_SCALARS as readonly string[]).includes(attribute.type);
  };

  /**
   * Check if the given attribute is a GraphQL scalar
   * @param {object} attribute
   * @return {boolean}
   */
  // Only the type is read: filter operators pass `{ type }` for a GraphQL scalar name.
  const isGraphQLScalar = (attribute: { type: string }) => {
    const { GRAPHQL_SCALARS } = strapi.plugin('graphql').service('constants');

    return (GRAPHQL_SCALARS as readonly string[]).includes(attribute.type);
  };

  /**
   * Check if the given attribute is a polymorphic relation
   * @param {object} attribute
   * @return {boolean}
   */
  const isMorphRelation = (attribute: Schema.Attribute.AnyAttribute) => {
    return attribute.type === 'relation' && attribute.relation.includes('morph');
  };

  /**
   * Check if the given attribute is a media
   * @param {object} attribute
   * @return {boolean}
   */
  const isMedia = propEq('type', 'media');

  /**
   * Check if the given attribute is a relation
   * @param {object} attribute
   * @return {boolean}
   */
  const isRelation = propEq('type', 'relation');

  /**
   * Check if the given attribute is an enum
   * @param {object} attribute
   * @return {boolean}
   */
  const isEnumeration = propEq('type', 'enumeration');

  /**
   * Check if the given attribute is a component
   * @param {object} attribute
   * @return {boolean}
   */
  const isComponent = propEq('type', 'component');

  /**
   * Check if the given attribute is a dynamic zone
   * @param {object} attribute
   * @return {boolean}
   */
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
