import type { Attribute } from '@strapi/types';

/**
 *
 * Retrieves the relation type
 */
export const getRelationType = (
  relation: Attribute.RelationKind.WithTarget | undefined,
  targetAttribute?: string | null
) => {
  const hasNotTargetAttribute = targetAttribute === undefined || targetAttribute === null;

  if (relation === 'oneToOne' && hasNotTargetAttribute) {
    return 'oneWay';
  }

  if (relation === 'oneToMany' && hasNotTargetAttribute) {
    return 'manyWay';
  }

  return relation;
};
