/* eslint-disable no-confusing-arrow */

import { Attribute } from '@strapi/types';

const shouldPluralizeName = (nature: Attribute.RelationKind.Any) =>
  ['manyToMany', 'oneToMany', 'manyWay'].includes(nature) ? 2 : 1;

const shouldPluralizeTargetAttribute = (nature: Attribute.RelationKind.Any) =>
  ['manyToMany', 'manyToOne'].includes(nature) ? 2 : 1;

export { shouldPluralizeName, shouldPluralizeTargetAttribute };
